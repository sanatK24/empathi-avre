import anyio
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from models import Request, Vendor, Inventory, Match, MatchStatus, RequestStatus
from repositories.match_repo import match_repo
from services.empathi_engine import EmpathIEngine
from services.ranking_service import RankingService
from realtime import emit_and_broadcast_sync
from events import EventType
from core.logging import logger

class MatchingService:
    @staticmethod
    def get_or_generate_matches(db: Session, request: Request) -> List[Match]:
        """
        Main entry point for fetching or generating matches for a request.
        """
        # 1. Check if matches already exist
        matches = match_repo.get_by_request(db, request.id)
        
        if not matches and request.status in {RequestStatus.PENDING, RequestStatus.MATCHED}:
            # 2. Trigger Engine to generate new candidates (Candidate Retrieval)
            engine = EmpathIEngine()
            # In a full refactor, engine.get_candidates would return (Vendor, Inventory) tuples
            # For now, we'll let it do its thing and then "re-rank" or use its output
            candidates = engine.match(db, request)
            
            # (Optional) Re-rank using the new Shared RankingService if available
            # ...
            matches = []
            for candidate in candidates:
                match = Match(
                    request_id=request.id,
                    vendor_id=candidate["vendor_id"],
                    score=candidate["relevance_score"],
                    ml_score=candidate["relevance_score"], # Placeholder for now
                    explanation_json=candidate.get("explanation"), # Tracking explanation
                    status=MatchStatus.PENDING
                )
                db.add(match)
                matches.append(match)
                
                # Notify Vendor (Side effect)
                MatchingService._notify_vendor_matched(candidate["vendor_id"], request, candidate["relevance_score"])
            
            db.commit()
            
            # 4. Update request status to MATCHED if we found anything
            if matches and request.status == RequestStatus.PENDING:
                request.status = RequestStatus.MATCHED
                db.commit()
        
        return matches

    @staticmethod
    def accept_match(db: Session, request: Request, vendor_id: int) -> Match:
        """
        Handles the acceptance flow for a specific vendor.
        """
        match = db.query(Match).filter(
            Match.request_id == request.id,
            Match.vendor_id == vendor_id
        ).first()
        
        if not match:
            raise Exception("Match not found")
            
        if match.status not in {MatchStatus.PENDING, MatchStatus.ACCEPTED_BY_VENDOR}:
            raise Exception(f"Cannot accept match in status {match.status}")

        # 1. Update Match Status
        match.status = MatchStatus.ACCEPTED_BY_REQUESTER
        
        # 2. Update Request Status
        request.status = RequestStatus.ACCEPTED
        
        # 3. Cancel other candidates
        match_repo.cancel_other_matches(db, request.id, vendor_id)
        
        db.commit()
        
        # 4. Side Effects (Events)
        MatchingService._notify_match_accepted(request, match)
        
        return match

    @staticmethod
    def _notify_vendor_matched(vendor_id: int, request: Request, score: float):
        try:
            emit_and_broadcast_sync(
                EventType.VENDOR_MATCHED,
                {
                    "vendor_id": vendor_id,
                    "request_id": request.id,
                    "resource_name": request.resource_name,
                    "urgency": request.urgency_level.value,
                    "match_score": round(score, 2)
                }
            )
        except Exception as e:
            logger.error(f"Event emission failed: {e}")

    @staticmethod
    def _notify_match_accepted(request: Request, match: Match):
        try:
            emit_and_broadcast_sync(
                EventType.MATCH_ACCEPTED_BY_REQUESTER,
                {
                    "requester_id": request.user_id,
                    "vendor_id": match.vendor_id,
                    "request_id": request.id,
                    "match_id": match.id
                }
            )
        except Exception as e:
            logger.error(f"Event emission failed: {e}")
