import anyio
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from models import Request, Vendor, Inventory, Match, MatchStatus, RequestStatus
from repositories.match_repo import match_repo
from services.empathi_engine import EmpathIEngine
from services.ranking_service import RankingService
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
                
                # No notification side-effect for now (RabbitMQ removed)
                pass 
            
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
        
        # No side effects for now (RabbitMQ removed)
        pass
        
        return match

