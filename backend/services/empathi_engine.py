from sqlalchemy.orm import Session
from models import Vendor, Request, Inventory, ScoringConfig, Match
from services.feature_builder import FeatureBuilder
from services.rules import BusinessRules
from services.fairness import FairnessManager
from core.location import LocationUtils
import os
import pickle
import json
from typing import List, Dict, Any

class EmpathIEngine:
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
            if os.path.exists(self.features_path):
                with open(self.features_path, "r") as f:
                    self.feature_names = json.load(f)
            else:
                self.feature_names = [
                    "distance_km", "stock_ratio", "vendor_rating", "reliability_score",
                    "avg_response_time", "category_match", "urgency_level", "freshness_score", "price"
                ]
        except Exception as e:
            print(f"Initialization Error in EmpathIEngine: {e}")

    def get_ml_scores_batch(self, features_list: List[Dict[str, Any]]) -> List[float]:
        if not self.model or not features_list:
            return [0.5] * len(features_list)
        
        all_values = []
        for features in features_list:
            values = [features.get(name, 0) for name in self.feature_names]
            all_values.append(values)
            
        try:
            predictions = self.model.predict(all_values)
            return [float(p) for p in predictions]
        except Exception:
            return [0.5] * len(features_list)

    def match(self, db: Session, request: Request) -> List[Dict[str, Any]]:
        # 1. Fetch eligible vendors WITH inventory using fuzzy matching for resource_name
        results = db.query(Vendor, Inventory).join(Inventory, Vendor.id == Inventory.vendor_id).filter(
            Vendor.is_active == True,
            Inventory.quantity >= request.quantity,
            # Handle pluralization and casing (e.g., "Mask" vs "masks")
            (Inventory.resource_name.ilike(f"%{request.resource_name}%")) | 
            (request.resource_name.ilike(f"%{Inventory.resource_name}%"))
        ).all()
        
        # 2. Config
        config = db.query(ScoringConfig).first()
        if not config:
            config = ScoringConfig(ml_weight=0.4, urgency_weight=0.2, fairness_weight=0.1, stock_weight=0.2, freshness_weight=0.1)
            
        candidates_data = []
        for vendor, inventory in results:
            if not BusinessRules.is_eligible(request, vendor, inventory):
                continue
            
            # Use LocationUtils for distance calculation
            dist_km = LocationUtils.haversine_distance(request.location_lat, request.location_lng, vendor.lat, vendor.lng)
            
            # Heuristic features for fallback
            features = FeatureBuilder.build_features(request, vendor, inventory, success_rate=vendor.reliability_score)
            features["distance_km"] = dist_km
            
            candidates_data.append({
                "vendor": vendor,
                "inventory": inventory,
                "distance_km": dist_km,
                "features": features
            })
            
        if not candidates_data:
            return []
            
        # 3. ML Prediction
        ml_scores = self.get_ml_scores_batch([c["features"] for c in candidates_data])
        
        ranked_results = []
        for i, candidate in enumerate(candidates_data):
            vendor = candidate["vendor"]
            dist_km = candidate["distance_km"]
            features = candidate["features"]
            ml_prediction = ml_scores[i]
            
            # Apply location-intelligent penalties
            from config import settings
            dist_penalty = 0.5 if dist_km > settings.MAX_MATCH_DISTANCE_KM else 1.0
            proximity_boost = LocationUtils.get_proximity_score(dist_km)
            
            final_score = (
                config.ml_weight * ml_prediction +
                config.urgency_weight * (features["speed_score"] if request.urgency_level.value in ["high", "critical"] else 0.5) +
                config.fairness_weight * (FairnessManager.calculate_fairness_boost(vendor) + proximity_boost)/2 +
                config.stock_weight * features["availability_score"] +
                config.freshness_weight * features["freshness_score"]
            ) * dist_penalty
            
            ranked_results.append({
                "vendor_id": vendor.id,
                "shop_name": vendor.shop_name,
                "distance_km": dist_km,
                "relevance_score": round(final_score * 100, 2),
                "explanation": self.generate_explanation(dist_km, features, final_score),
                "eta": f"{vendor.avg_response_time} mins",
                "rating": round(vendor.rating, 1),
                "reviews": vendor.total_completed_orders,
                "price": f"₹{features.get('price', 0)}",
                "available_stock": features.get("stock_quantity", 0)
            })
            
        ranked_results.sort(key=lambda x: x["relevance_score"], reverse=True)
        for i, res in enumerate(ranked_results):
            res["rank"] = i + 1
            
        return ranked_results

    def generate_explanation(self, dist_km: float, features: Dict[str, Any], score: float) -> str:
        reasons = []
        if dist_km < 2.0:
            reasons.append("Ultra-proximity (<2km)")
        elif dist_km < 5.0:
            reasons.append("Nearby location")
            
        if features.get("availability_score", 0) > 0.9:
            reasons.append("High stock availability")
        if features.get("speed_score", 0) > 0.8:
            reasons.append("Fast responder")
        if features.get("freshness_score", 0) > 0.9:
            reasons.append("Fresh data")
            
        return " | ".join(reasons) if reasons else "Balanced match"
