import math
from typing import Dict, Any, Optional
from models import Vendor, Request, Inventory
from datetime import datetime

class FeatureBuilder:
    @staticmethod
    def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        R = 6371  # Earth radius in km
        d_lat = math.radians(lat2 - lat1)
        d_lng = math.radians(lng2 - lng1)
        a = (math.sin(d_lat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(d_lng / 2) ** 2)
        c = 2 * math.asin(math.sqrt(a))
        return R * c

    @classmethod
    def build_features(
        cls, 
        request: Request, 
        vendor: Vendor, 
        inventory: Inventory,
        success_rate: float = 0.8,
        actual_avg_response_time: Optional[int] = None
    ) -> Dict[str, Any]:
        distance = cls.haversine_distance(request.location_lat, request.location_lng, vendor.lat, vendor.lng)
        
        # Real avg response time if available, otherwise use vendor's default
        response_time = actual_avg_response_time if actual_avg_response_time is not None else vendor.avg_response_time
        
        # Freshness: hours since inventory update
        freshness_hours = (datetime.now() - inventory.updated_at).total_seconds() / 3600.0 if inventory.updated_at else 48.0
        
        # Raw Features
        features = {
            "distance_km": distance,
            "stock_quantity": inventory.quantity,
            "requested_quantity": request.quantity,
            "stock_ratio": inventory.quantity / request.quantity if request.quantity > 0 else 0,
            "vendor_rating": vendor.rating,
            "avg_response_time": response_time,
            "urgency_level": {"low": 1, "medium": 2, "high": 3, "critical": 4}.get(request.urgency_level.value, 2),
            "category_match": 1 if request.category == vendor.category else 0,
            "price": inventory.price or 0,
            "active_status": 1 if vendor.is_active else 0,
            "vendor_success_rate": success_rate,
            "total_completed_orders": vendor.total_completed_orders,
            "city_match": 1 if request.city == vendor.city else 0,
            "recency_of_inventory_update": freshness_hours
        }

        # Engineered Scores (0-1 range)
        features["distance_score"] = math.exp(-0.2 * distance)
        features["speed_score"] = 1 / (1 + response_time / 30)
        features["availability_score"] = min(1.0, features["stock_ratio"])
        features["trust_score"] = vendor.rating / 5.0
        features["freshness_score"] = math.exp(-0.01 * freshness_hours)
        
        return features
