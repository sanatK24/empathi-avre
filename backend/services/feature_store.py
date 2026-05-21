import math
from datetime import datetime
from typing import Dict, Any, List, Optional
from models import Vendor, Request, Inventory
from core.location import LocationUtils

class FeatureStore:
    @staticmethod
    def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """
        Uses LocationUtils to get distance, or falls back to basic haversine if LocationUtils fails.
        """
        try:
            return LocationUtils.haversine_distance(lat1, lng1, lat2, lng2)
        except Exception:
            # Fallback haversine formula
            R = 6371.0  # Earth radius in km
            d_lat = math.radians(lat2 - lat1)
            d_lng = math.radians(lng2 - lng1)
            a = (math.sin(d_lat / 2) ** 2 +
                 math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
                 math.sin(d_lng / 2) ** 2)
            c = 2 * math.asin(math.sqrt(a))
            return R * c

    @classmethod
    def build_request_features(
        cls,
        request: Request,
        vendor: Vendor,
        inventory: Optional[Inventory] = None
    ) -> Dict[str, float]:
        """
        Builds the 11 standardized features for a request-vendor pair.
        Ensures robust default values if any input attributes are missing or None.
        """
        # --- 1. Spatial Features ---
        try:
            distance = cls.haversine_distance(request.location_lat, request.location_lng, vendor.lat, vendor.lng)
        except Exception:
            distance = 15.0  # Default fallback distance

        proximity_score = math.exp(-0.2 * distance)

        # --- 2. Inventory Features ---
        if inventory is not None:
            stock_qty = inventory.quantity if inventory.quantity is not None else 0
            # freshness: hours since inventory update
            updated_at = inventory.updated_at if inventory.updated_at else datetime.min
            if updated_at == datetime.min:
                freshness_hours = 48.0
            else:
                freshness_hours = (datetime.now() - updated_at).total_seconds() / 3600.0
        else:
            stock_qty = 0
            freshness_hours = 168.0  # 1 week decay penalty default for missing inventory

        req_qty = request.quantity if request.quantity is not None else 1
        stock_ratio = stock_qty / req_qty if req_qty > 0 else 0.0
        availability_score = min(1.0, stock_ratio)
        freshness_score = math.exp(-0.01 * freshness_hours)

        # --- 3. Vendor Features ---
        vendor_rating = vendor.rating if vendor.rating is not None else 3.5
        success_rate = vendor.reliability_score if vendor.reliability_score is not None else 0.8
        
        response_time = vendor.avg_response_time if vendor.avg_response_time is not None else 15
        speed_score = 1.0 / (1.0 + response_time / 30.0)

        # --- 4. Context & Match Features ---
        req_cat = request.category.lower() if request.category else ""
        ven_cat = vendor.category.lower() if vendor.category else ""
        category_match = 1.0 if req_cat == ven_cat else 0.0

        req_city = request.city.lower().strip() if request.city else ""
        ven_city = vendor.city.lower().strip() if vendor.city else ""
        city_match = 1.0 if req_city == ven_city else 0.0

        urgency_map = {"low": 1.0, "medium": 2.0, "high": 3.0, "critical": 4.0}
        req_urgency = request.urgency_level.value.lower() if hasattr(request.urgency_level, "value") else str(request.urgency_level).lower()
        urgency_weight = urgency_map.get(req_urgency, 2.0)

        # return dictionary of exactly 11 standardized features
        return {
            "distance_km": float(distance),
            "proximity_score": float(proximity_score),
            "stock_ratio": float(stock_ratio),
            "availability_score": float(availability_score),
            "freshness_score": float(freshness_score),
            "vendor_rating": float(vendor_rating),
            "success_rate": float(success_rate),
            "speed_score": float(speed_score),
            "category_match": float(category_match),
            "city_match": float(city_match),
            "urgency_weight": float(urgency_weight)
        }

    @classmethod
    def vectorize_batch(
        cls,
        request: Request,
        candidates: List[Dict[str, Any]]
    ) -> List[Dict[str, float]]:
        """
        Batch processes a list of candidates.
        Each candidate is expected to have: {"vendor": Vendor, "inventory": Inventory}
        """
        features_list = []
        for c in candidates:
            features = cls.build_request_features(request, c["vendor"], c.get("inventory"))
            features_list.append(features)
        return features_list
