import math
from datetime import datetime
from typing import Dict, Any, List
from core.location import LocationUtils

class FeatureEngine:
    @staticmethod
    def get_semantic_similarity(text1: str, text2: str) -> float:
        """Placeholder for BERT/SentenceTransformer similarity."""
        if not text1 or not text2: return 0.0
        return 0.8 if text1.lower() in text2.lower() or text2.lower() in text1.lower() else 0.5

    @staticmethod
    def build_request_features(request: Any, vendor: Any, inventory: Any) -> Dict[str, float]:
        dist = LocationUtils.haversine_distance(
            request.location_lat, request.location_lng,
            vendor.lat, vendor.lng
        )
        
        # Semantic Match
        semantic_score = FeatureEngine.get_semantic_similarity(request.resource_name, inventory.resource_name if inventory else "")
        
        # Stock signals
        stock_qty = inventory.quantity if inventory else 0
        req_qty = request.quantity
        stock_ratio = stock_qty / req_qty if req_qty > 0 else 0
        
        # Freshness
        updated_at = inventory.updated_at if inventory else datetime.min
        freshness_hours = (datetime.now() - updated_at).total_seconds() / 3600.0 if inventory else 168.0 
        
        return {
            "distance_km": dist,
            "semantic_score": semantic_score,
            "stock_ratio": min(2.0, stock_ratio),
            "vendor_rating": vendor.rating,
            "reliability_score": vendor.reliability_score,
            "same_city": 1.0 if LocationUtils.same_city(request.city, vendor.city) else 0.0,
            "proximity_score": LocationUtils.get_proximity_score(dist),
            "category_match": 1.0 if request.category == vendor.category else 0.0,
            "urgency_weight": {"low": 1, "medium": 2, "high": 3, "critical": 4}.get(request.urgency_level.value, 2),
            "freshness_score": math.exp(-0.01 * freshness_hours),
            "price_score": 1.0 / (1.0 + (inventory.price / 100) if inventory and inventory.price else 10.0)
        }

    @staticmethod
    def build_campaign_features(campaign: Any, user: Any) -> Dict[str, float]:
        # Distance calculation for campaigns
        dist = LocationUtils.haversine_distance(user.lat, user.lng, campaign.lat, campaign.lng)
        
        return {
            "distance_km": dist,
            "same_city": 1.0 if LocationUtils.same_city(user.city, campaign.city) else 0.0,
            "proximity_score": LocationUtils.get_proximity_score(dist, decay=0.1),
            "category_affinity": 0.5,
            "verification_score": 1.0 if campaign.verified else 0.0,
            "urgency_score": {"low": 1, "medium": 2, "high": 3, "critical": 4}.get(campaign.urgency_level.value, 2),
            "campaign_progress": (campaign.raised_amount / campaign.goal_amount) if campaign.goal_amount > 0 else 0,
            "remaining_goal": max(0, campaign.goal_amount - campaign.raised_amount) / 1000.0
        }
