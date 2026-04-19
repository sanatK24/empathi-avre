from sqlalchemy.orm import Session
from models import Vendor, Request, Inventory, ScoringConfig, Match
from services.feature_builder import FeatureBuilder
from services.rules import BusinessRules
from services.fairness import FairnessManager
import os
import pickle
import json
from typing import List, Dict, Any

class AVREEngine:
    def __init__(self):
        # Path configuration
        self.model_dir = "ml"
        self.model_filename = "model.pkl"
        self.features_filename = "feature_columns.json"
        
        self.model_path = os.path.join(self.model_dir, self.model_filename)
        self.features_path = os.path.join("ml_artifacts", self.features_filename)
        
        self.model = None
        self.feature_names = []
        self._load_assets()

    def _load_assets(self):
        """Load model and feature names safely with version fallback."""
        try:
            if os.path.exists(self.model_path):
                with open(self.model_path, "rb") as f:
                    self.model = pickle.load(f)
                print(f"Loaded AVRE Model: {self.model_path}")
            else:
                print(f"Warning: Model not found at {self.model_path}. Using rules-only fallback.")

            if os.path.exists(self.features_path):
                with open(self.features_path, "r") as f:
                    self.feature_names = json.load(f)
            else:
                # Hardcoded fallback synced with ml_process.py
                self.feature_names = [
                    "distance_km", "stock_quantity", "requested_quantity", "stock_ratio",
                    "vendor_rating", "avg_response_time", "urgency_level", "category_match",
                    "price", "active_status", "vendor_success_rate", "total_completed_orders",
                    "city_match", "recency_of_inventory_update", "distance_score",
                    "speed_score", "availability_score", "trust_score", "freshness_score"
                ]
        except Exception as e:
            print(f"Initialization Error in AVREEngine: {e}")
            self.model = None

    def get_ml_scores_batch(self, features_list: List[Dict[str, Any]]) -> List[float]:
        """Batch prediction with feature alignment enforcement."""
        if not self.model or not features_list:
            return [0.5] * len(features_list)
        
        all_values = []
        for features in features_list:
            # Enforce exact order from training
            values = [features.get(name, 0) for name in self.feature_names]
            all_values.append(values)
            
        try:
            # Use the model's predict method
            predictions = self.model.predict(all_values)
            return [float(p) for p in predictions]
        except Exception as e:
            print(f"ML Inference Error: {e}")
            return [0.5] * len(features_list)

    def match(self, db: Session, request: Request) -> List[Dict[str, Any]]:
        # 1. Fetch eligible vendors WITH inventory in a single JOIN query (Priority 3: Fix N+1)
        # 2. Filter by status, category, and minimum stock directly in DB
        eligible_query = db.query(Vendor, Inventory).join(Inventory, Vendor.id == Inventory.vendor_id).filter(
            Vendor.is_active == True,
            Inventory.resource_name == request.resource_name,
            Inventory.quantity >= request.quantity,
            # Vendor.city == request.city # Optional: Keep city match as a feature rather than a hard filter for flexibility
        )
        
        results = eligible_query.all()
        
        # 3. Config
        config = db.query(ScoringConfig).first()
        if not config:
            config = ScoringConfig(
                ml_weight=0.4,
                urgency_weight=0.2,
                fairness_weight=0.1,
                stock_weight=0.2,
                freshness_weight=0.1
            )
        else:
            # Safe fallbacks in case of partial nulls
            config.ml_weight = config.ml_weight if config.ml_weight is not None else 0.4
            config.urgency_weight = config.urgency_weight if config.urgency_weight is not None else 0.2
            config.fairness_weight = config.fairness_weight if config.fairness_weight is not None else 0.1
            config.stock_weight = config.stock_weight if config.stock_weight is not None else 0.2
            config.freshness_weight = config.freshness_weight if config.freshness_weight is not None else 0.1
            
        candidates_data = []
        
        # 4. Build feature sets for batching
        for vendor, inventory in results:
            # Re-verify eligibility (in case of complex rules)
            if not BusinessRules.is_eligible(request, vendor, inventory):
                continue
            
            # Calculate Success Rate
            total_matches = db.query(Match).filter(Match.vendor_id == vendor.id).count()
            success_rate = vendor.total_completed_orders / total_matches if total_matches > 0 else 0.8
            
            # Compute features
            features = FeatureBuilder.build_features(request, vendor, inventory, success_rate=success_rate)
            
            candidates_data.append({
                "vendor": vendor,
                "features": features
            })
            
        if not candidates_data:
            return []
            
        # 5. ML Batch Prediction (Priority 3: Batch Inference)
        ml_scores = self.get_ml_scores_batch([c["features"] for c in candidates_data])
        
        ranked_results = []
        for i, candidate in enumerate(candidates_data):
            vendor = candidate["vendor"]
            features = candidate["features"]
            ml_prediction = ml_scores[i]
            
            # 6. Apply Novelty Formula with distance ceiling (Phase 6 Fix)
            dist_km = features["distance_km"]
            # Apply severe penalty for extreme distances (>20km) to avoid overvaluing stock/rating
            dist_penalty = 0.5 if dist_km > 20.0 else 1.0
            
            urgency_adaptation = features["speed_score"] if request.urgency_level.value in ["high", "critical"] else 0.5
            fairness_boost = FairnessManager.calculate_fairness_boost(vendor)
            stock_confidence = features["availability_score"]
            freshness_score = features["freshness_score"]
            
            final_score = (
                config.ml_weight * ml_prediction +
                config.urgency_weight * urgency_adaptation +
                config.fairness_weight * fairness_boost +
                config.stock_weight * stock_confidence +
                config.freshness_weight * freshness_score
            ) * dist_penalty
            
            ranked_results.append({
                "vendor_id": vendor.id,
                "shop_name": vendor.shop_name,
                "distance_km": round(features["distance_km"], 2),
                "relevance_score": round(final_score * 100, 2), # Convert to percentage
                "explanation": self.generate_explanation(features, final_score),
                "eta": f"{vendor.avg_response_time} mins",
                "rating": round(vendor.rating, 1),
                "reviews": vendor.total_completed_orders,
                "price": f"₹{features.get('price', 0)}",
                "available_stock": features.get("stock_quantity", 0),
                "freshness": "Very High" if features["freshness_score"] > 0.9 else "High"
            })
            
        # 7. Rank and Return
        ranked_results.sort(key=lambda x: x["relevance_score"], reverse=True)
        # Add rank field for API consistency
        for i, res in enumerate(ranked_results):
            res["rank"] = i + 1
            
        return ranked_results

    def generate_explanation(self, features: Dict[str, Any], score: float) -> str:
        reasons = []
        if features["distance_km"] < 2.0:
            reasons.append("Ultra-proximity (<2km)")
        elif features["distance_km"] < 5.0:
            reasons.append("Nearby location")
            
        if features["availability_score"] > 0.9:
            reasons.append("Full stock availability")
        elif features["availability_score"] > 0.5:
            reasons.append("Sufficient stock")
            
        if features["speed_score"] > 0.9:
            reasons.append("Instant responder (top 10%)")
        elif features["speed_score"] > 0.7:
            reasons.append("Fast average response")
            
        if features["trust_score"] > 0.9:
            reasons.append("Elite reliability rating")
        elif features["trust_score"] > 0.8:
            reasons.append("Highly trusted")
            
        if features["freshness_score"] > 0.9:
            reasons.append("Inventory data is very fresh")
            
        return " | ".join(reasons) if reasons else "Balanced performance match"
