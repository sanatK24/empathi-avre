import math
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from models import Vendor, Request, Match, ScoringConfig
from core.location import LocationUtils

class FairnessReranker:
    DECAY_RATE_ALPHA = 0.02  # dynamic decay per hour (~50% decay every 35 hours)

    @classmethod
    def decay_fairness_penalty(cls, db: Session, vendor: Vendor) -> float:
        """
        Dynamically calculates temporal decay of the vendor's penalty based on the
        time elapsed since their last match event.
        Formula: P(i) = P(i) * exp(-alpha * delta_t)
        """
        current_penalty = vendor.fairness_penalty if vendor.fairness_penalty is not None else 0.0
        if current_penalty <= 1e-5:
            vendor.fairness_penalty = 0.0
            return 0.0

        # Find latest match event for this vendor
        latest_match = db.query(Match).filter(
            Match.vendor_id == vendor.id
        ).order_by(Match.created_at.desc()).first()

        reference_time = latest_match.created_at if latest_match else vendor.created_at
        if not reference_time:
            reference_time = datetime.now()

        delta_t_hours = (datetime.now() - reference_time).total_seconds() / 3600.0
        if delta_t_hours < 0:
            delta_t_hours = 0.0

        decay_factor = math.exp(-cls.DECAY_RATE_ALPHA * delta_t_hours)
        decayed_penalty = current_penalty * decay_factor
        
        # Keep penalty bounded and update vendor in DB session
        vendor.fairness_penalty = max(0.0, round(decayed_penalty, 4))
        return vendor.fairness_penalty

    @classmethod
    def rerank_candidates(
        cls,
        db: Session,
        request: Request,
        candidates: List[Dict[str, Any]],
        raw_scores: List[float],
        config: ScoringConfig,
        trust_scores: dict = None  # Phase 2: dict[vendor_id -> TrustScore], optional
    ) -> List[Dict[str, Any]]:
        """
        Post-processes raw GBDT/RF model predictions with exposure-balancing fairness penalty
        and proximity boost, sorting into a final relevance ranking.
        
        Phase 2 extension: applies trust_multiplier = composite_trust^0.5 before final scoring.
        If trust_scores is None (no model loaded), multiplier = 1.0 (backward compatible).

        Formula:
          trust_multiplier = composite_trust ^ 0.5   (sqrt dampening)
          fairness_discount = 1.0 / (1.0 + gamma * fairness_penalty)
          Final = (Raw_ML_Score * trust_multiplier * fairness_discount + beta * proximity_boost) * 100
        """
        # Ensure config weights are set
        gamma = config.fairness_weight if config and config.fairness_weight is not None else 0.1
        
        reranked_results = []
        for i, candidate in enumerate(candidates):
            vendor = candidate["vendor"]
            dist_km = candidate["distance_km"]
            features = candidate["features"]
            raw_ml = raw_scores[i]

            # 1. Dynamically decay the penalty in db and retrieve
            decayed_penalty = cls.decay_fairness_penalty(db, vendor)

            # 2. Get location proximity boost and penalties
            proximity_boost = LocationUtils.get_proximity_score(dist_km)
            from config import settings
            dist_penalty = 0.5 if dist_km > settings.MAX_MATCH_DISTANCE_KM else 1.0

            # 3. Phase 2: Compute trust multiplier (sqrt dampening)
            # trust=1.0 -> multiplier=1.0 | trust=0.64 -> multiplier=0.80 | trust=0.0 -> multiplier=0.0
            if trust_scores is not None:
                trust = trust_scores.get(vendor.id)
                composite = trust.composite_trust_score if trust else 0.80
                import math as _math
                trust_multiplier = round(_math.sqrt(max(0.0, min(1.0, composite))), 4)
            else:
                trust_multiplier = 1.0  # No effect when trust layer is not loaded

            # 4. Calculate discount term (fairness)
            discount = 1.0 / (1.0 + gamma * decayed_penalty)
            
            # 5. Calculate final score out of 100
            # S_Final = S_Raw * trust_multiplier * fairness_discount + proximity_boost components
            ml_component = raw_ml * trust_multiplier * discount
            
            # Ensure relevance score is nicely bounded between 0 and 100
            final_relevance = (
                0.5 * ml_component +
                0.2 * (features["speed_score"] if request.urgency_level.value.lower() in ["high", "critical"] else 0.5) +
                0.1 * proximity_boost +
                0.1 * features["availability_score"] +
                0.1 * features["freshness_score"]
            ) * 100 * dist_penalty

            reranked_results.append({
                "vendor": vendor,
                "inventory": candidate["inventory"],
                "distance_km": dist_km,
                "features": features,
                "raw_ml_score": raw_ml,
                "fairness_penalty_applied": round(decayed_penalty, 4),
                "relevance_score": round(max(0.0, min(100.0, final_relevance)), 2),
                "eta": f"{vendor.avg_response_time} mins",
                "rating": round(vendor.rating, 1) if vendor.rating is not None else 3.5,
                "reviews": vendor.total_completed_orders if vendor.total_completed_orders is not None else 0,
                "price": f"₹{features.get('price', 0)}",
                "available_stock": features.get("stock_quantity", 0),
                "image_url": candidate["inventory"].image_url if candidate.get("inventory") else None,
                "description": candidate["inventory"].description if candidate.get("inventory") else None
            })

        # Sort by relevance score descending
        reranked_results.sort(key=lambda x: x["relevance_score"], reverse=True)
        return reranked_results

    @classmethod
    def apply_impression_penalty(cls, db: Session, vendor_ids: List[int]):
        """
        Applies a penalty of 0.05 and increments total_impressions for the top-ranked candidates.
        Called when matches are generated and returned to the requester dashboard (impressions).
        """
        if not vendor_ids:
            return
        
        vendors = db.query(Vendor).filter(Vendor.id.in_(vendor_ids)).all()
        for vendor in vendors:
            vendor.fairness_penalty = (vendor.fairness_penalty or 0.0) + 0.05
            vendor.total_impressions = (vendor.total_impressions or 0) + 1
        db.commit()

    @classmethod
    def apply_selection_penalty(cls, db: Session, vendor_id: int):
        """
        Applies a penalty of 0.20 and increments total_selections when a vendor is accepted.
        """
        vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
        if vendor:
            vendor.fairness_penalty = (vendor.fairness_penalty or 0.0) + 0.20
            vendor.total_selections = (vendor.total_selections or 0) + 1
            db.commit()
