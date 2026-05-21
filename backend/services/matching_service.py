import anyio
import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from models import Request, Vendor, Inventory, Match, MatchStatus, RequestStatus, VendorTrustProfile
from repositories.match_repo import match_repo
from services.empathi_engine import EmpathIEngine
from services.fairness_reranker import FairnessReranker
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
            # 2. Trigger Engine to generate new candidates through the pipeline
            engine = EmpathIEngine()
            candidates = engine.match(db, request)
            
            matches = []
            for candidate in candidates:
                # We serialize the full computed feature mapping inside explanation_json for transparency
                explanation = candidate.get("explanation", "Match generated")
                explanation_data = {
                    "text": explanation,
                    "features": candidate.get("features", {}),
                    # Phase 2: include decomposed trust signals in explanation_json
                    "trust": {
                        "trust_score": candidate.get("trust_score"),
                        "fulfillment_score": candidate.get("fulfillment_score"),
                        "dispute_risk": candidate.get("dispute_risk"),
                        "refund_risk": candidate.get("refund_risk"),
                        "delivery_reliability": candidate.get("delivery_reliability"),
                        "anomaly_risk": candidate.get("anomaly_risk"),
                    }
                }
                
                match = Match(
                    request_id=request.id,
                    vendor_id=candidate["vendor_id"],
                    score=candidate["relevance_score"],
                    ml_score=candidate.get("raw_ml_score", candidate["relevance_score"]),
                    lgbm_score=candidate.get("lgbm_score"),
                    fairness_penalty_applied=candidate.get("fairness_penalty_applied", 0.0),
                    rank_position=candidate.get("rank"),
                    explanation_json=json.dumps(explanation_data),
                    status=MatchStatus.PENDING,
                    # Phase 2: persist trust scoring fields (nullable)
                    trust_score=candidate.get("trust_score"),
                    fulfillment_probability=candidate.get("fulfillment_score"),
                    risk_adjusted_score=candidate.get("relevance_score"),
                )
                db.add(match)
                matches.append(match)
            
            db.commit()
            
            # 3. Update request status to MATCHED if matches were successfully created
            if matches and request.status == RequestStatus.PENDING:
                request.status = RequestStatus.MATCHED
                db.commit()
        
        return matches

    @staticmethod
    def accept_match(db: Session, request: Request, vendor_id: int) -> Match:
        """
        Handles the acceptance flow for a specific vendor.
        Phase 2: Also initiates a simulated escrow transaction.
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
        
        # 4. Apply the Dynamic Selection Penalty
        FairnessReranker.apply_selection_penalty(db, vendor_id)
        
        db.commit()

        # 5. Phase 2: Initiate simulated escrow transaction
        try:
            from services.transaction_service import TransactionService
            trust_score = match.trust_score  # Already persisted from engine output
            TransactionService.initiate(db, match, trust_score=trust_score)
        except Exception as e:
            logger.warning(f"[MatchingService] Transaction initiation failed for match {match.id}: {e}")
            # Non-critical — don't break the acceptance flow
        
        return match
