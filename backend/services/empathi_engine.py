from sqlalchemy.orm import Session
from models import Vendor, Request, Inventory, ScoringConfig, Match
from services.rules import BusinessRules
from services.feature_store import FeatureStore
from services.lgbm_service import LGBMService
from services.fairness_reranker import FairnessReranker
from services.trust_service import TrustService
from core.location import LocationUtils
from config import settings
import os
import json
from typing import List, Dict, Any

class EmpathIEngine:
    def __init__(self):
        # Initialize modern LGBM Inference Service
        self.lgbm_service = LGBMService()

    def match(self, db: Session, request: Request) -> List[Dict[str, Any]]:
        """
        Executes the modern 4-stage ranking pipeline:
        1. Candidate Retrieval (Geo filtering + category/resource fuzzy filtering + eligibility rules)
        2. Feature Store (Builds 11 standardized query-candidate features)
        3. LightGBM / RF Inference (Scores features, with robust fallbacks)
        4. Fairness-aware Post-processing Reranking & dynamic penalty updates
        """
        # --- STAGE 1: Candidate Retrieval + Trust Fraud Hard-Filter ---
        resource_search = request.resource_name if request.resource_name else ""
        results = db.query(Vendor, Inventory).join(Inventory, Vendor.id == Inventory.vendor_id).filter(
            Vendor.is_active == True,
            Inventory.quantity >= request.quantity,
            # Casing & pluralization handling via fuzzy ilike
            Inventory.resource_name.ilike(f"%{resource_search}%")
        ).all()

        candidates_data = []
        for vendor, inventory in results:
            if not BusinessRules.is_eligible(request, vendor, inventory):
                continue

            # Phase 2: Hard-filter fraud-flagged vendors before any scoring
            if TrustService.is_fraud_flagged(db, vendor):
                continue

            dist_km = LocationUtils.haversine_distance(
                request.location_lat, request.location_lng,
                vendor.lat, vendor.lng
            )

            candidates_data.append({
                "vendor": vendor,
                "inventory": inventory,
                "distance_km": dist_km
            })

        if not candidates_data:
            return []

        # --- STAGE 2 & 3: Feature Store & LGBM/RF Scoring ---
        # Features are computed in vectorize_batch inside score_candidates
        raw_scores, model_used, features_list = self.lgbm_service.score_candidates(request, candidates_data)

        # Attach computed features to candidates for downstream processing
        for i, candidate in enumerate(candidates_data):
            candidate["features"] = features_list[i]

        # --- STAGE 4: Trust Prediction Layer (Phase 2) ---
        # Batch trust scoring — cached per vendor, heuristic fallback if no model loaded
        trust_scores = TrustService.score_candidates(db, candidates_data)

        # Get system scoring config weights
        config = db.query(ScoringConfig).first()
        if not config:
            config = ScoringConfig(
                ml_weight=0.4,
                urgency_weight=0.2,
                fairness_weight=0.1,
                stock_weight=0.2,
                freshness_weight=0.1
            )

        # --- STAGE 5: Fairness-aware Re-ranking (trust-adjusted) ---
        reranked_candidates = FairnessReranker.rerank_candidates(
            db, request, candidates_data, raw_scores, config,
            trust_scores=trust_scores
        )

        # Format outputs and assign final 1-indexed ranks
        final_results = []
        for i, item in enumerate(reranked_candidates):
            features = item["features"]
            dist_km = item["distance_km"]
            final_relevance = item["relevance_score"]
            vendor_id = item["vendor"].id

            explanation = self.generate_explanation(dist_km, features, final_relevance / 100.0, model_used)

            # Phase 2: Attach decomposed trust scores
            trust = trust_scores.get(vendor_id)

            final_results.append({
                "vendor_id": vendor_id,
                "shop_name": item["vendor"].shop_name,
                "distance_km": dist_km,
                "relevance_score": final_relevance,
                "raw_ml_score": item["raw_ml_score"],
                "lgbm_score": item["raw_ml_score"],  # alias for backward-compatibility
                "fairness_penalty_applied": item["fairness_penalty_applied"],
                "explanation": explanation,
                "eta": item["eta"],
                "rating": item["rating"],
                "reviews": item["reviews"],
                "price": item["price"],
                "available_stock": item["available_stock"],
                "image_url": item["image_url"],
                "description": item["description"],
                "features": features,
                # Phase 2 trust fields (decomposed, all nullable)
                "trust_score": round(trust.composite_trust_score, 3) if trust else None,
                "fulfillment_score": round(trust.fulfillment_probability, 3) if trust else None,
                "dispute_risk": round(trust.dispute_probability, 3) if trust else None,
                "refund_risk": round(trust.refund_likelihood, 3) if trust else None,
                "delivery_reliability": round(trust.delivery_reliability, 3) if trust else None,
                "anomaly_risk": round(trust.anomaly_score, 3) if trust else None,
            })

        # Sort and assign ranks
        final_results.sort(key=lambda x: x["relevance_score"], reverse=True)
        for idx, res in enumerate(final_results):
            res["rank"] = idx + 1

        # --- Dynamic Impression Updates (Top-3) ---
        top_3_vendor_ids = [res["vendor_id"] for res in final_results[:3]]
        FairnessReranker.apply_impression_penalty(db, top_3_vendor_ids)

        return final_results

    def generate_explanation(
        self,
        dist_km: float,
        features: Dict[str, Any],
        score: float,
        model_used: str
    ) -> str:
        """
        Generates contextual description and highlights key reasons for recommendation.
        """
        reasons = []
        if dist_km < settings.ULTRA_PROXIMITY_THRESHOLD_KM:
            reasons.append("Ultra-proximity (<2km)")
        elif dist_km < settings.PROXIMITY_THRESHOLD_KM:
            reasons.append("Nearby location")

        if features.get("availability_score", 0.0) > 0.9:
            reasons.append("High stock availability")
        if features.get("speed_score", 0.0) > 0.8:
            reasons.append("Fast responder")
        if features.get("freshness_score", 0.0) > 0.9:
            reasons.append("Fresh inventory data")

        base_explanation = " | ".join(reasons) if reasons else "Balanced match"
        return f"{base_explanation} (via {model_used})"
