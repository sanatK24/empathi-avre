import math
from sqlalchemy.orm import Session
from models import Vendor, Inventory, Match, Request
from schemas import ScoringWeights, MatchResultWithVendor
from typing import List, Tuple
from ml_pipeline import ml_service

class AVREEngine:
    """Adaptive Vendor Relevance Engine - Scoring and Matching Logic"""

    def __init__(self, weights: ScoringWeights = None):
        self.weights = weights or ScoringWeights()

    def haversine_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """
        Calculate distance between two coordinates in kilometers.
        Returns approximate distance using Haversine formula.
        """
        R = 6371  # Earth's radius in km
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        distance = R * c
        return distance

    def compute_distance_score(self, distance_km: float, max_distance: float = 10.0) -> float:
        """
        Score based on proximity. Closer vendors get higher scores.
        Returns 0-100.
        """
        if distance_km > max_distance:
            return 0.0
        # Inverse linear: closer = higher
        score = max(0, 100 * (1 - distance_km / max_distance))
        return score

    def compute_stock_score(self, available_quantity: int, required_quantity: int) -> float:
        """
        Score based on inventory availability.
        Returns 0-100.
        """
        if available_quantity < required_quantity:
            return 0.0
        # More stock = higher score, capped at 100
        ratio = available_quantity / required_quantity
        score = min(100, ratio * 100)
        return score

    def compute_rating_score(self, vendor_rating: float) -> float:
        """
        Score based on vendor's historical rating (0-5 stars).
        Returns 0-100.
        """
        if vendor_rating < 0:
            vendor_rating = 0
        # Convert 0-5 scale to 0-100
        score = (vendor_rating / 5.0) * 100
        return min(100, score)

    def compute_speed_score(self, avg_response_time: int, max_response_time: int = 60) -> float:
        """
        Score based on vendor's average response time in minutes.
        Faster response = higher score.
        Returns 0-100.
        """
        if avg_response_time >= max_response_time:
            return 0.0
        # Inverse: lower time = higher score
        score = max(0, 100 * (1 - avg_response_time / max_response_time))
        return score

    def compute_urgency_score(self, urgency_level: str) -> float:
        """
        Urgency score on a 0-100 scale.
        High and critical urgency boost relevant vendors to the top.
        Returns 0-100.
        """
        urgency_multipliers = {
            "low": 0.0,
            "medium": 0.0,
            "high": 75.0,
            "critical": 100.0,
        }
        return urgency_multipliers.get(urgency_level, 0.0)

    def compute_final_score(
        self,
        distance_score: float,
        stock_score: float,
        rating_score: float,
        speed_score: float,
        urgency_score: float,
    ) -> float:
        """
        Weighted combination of all scores.
        Returns 0-100.
        """
        raw_score = (
            self.weights.distance_weight * distance_score +
            self.weights.stock_weight * stock_score +
            self.weights.rating_weight * rating_score +
            self.weights.speed_weight * speed_score +
            self.weights.urgency_weight * urgency_score
        )
        return min(100, max(0, raw_score))

    def match_request(
        self,
        db: Session,
        request: Request,
        weights: ScoringWeights = None
    ) -> List[Tuple[Vendor, float]]:
        """
        Main matching logic. Returns list of (Vendor, score) tuples, ranked by score.
        """
        if weights:
            self.weights = weights

        # Step 1: Fetch all active vendors with the requested resource
        eligible_vendors = db.query(Vendor).filter(
            Vendor.is_active == True
        ).all()

        candidates = []

        for vendor in eligible_vendors:
            # Check if vendor has the requested resource
            inventory_item = db.query(Inventory).filter(
                Inventory.vendor_id == vendor.id,
                Inventory.resource_name == request.resource_name
            ).first()

            if not inventory_item:
                continue

            # Step 2: Check if vendor has sufficient stock
            if inventory_item.quantity < request.quantity:
                continue

            # Step 3: Compute individual scores
            distance = self.haversine_distance(
                request.latitude, request.longitude,
                vendor.latitude, vendor.longitude
            )
            distance_score = self.compute_distance_score(distance)
            stock_score = self.compute_stock_score(inventory_item.quantity, request.quantity)
            rating_score = self.compute_rating_score(vendor.rating)
            speed_score = self.compute_speed_score(vendor.avg_response_time)
            urgency_score = self.compute_urgency_score(request.urgency)

            # Step 4: Compute final weighted score
            rule_based_score = self.compute_final_score(
                distance_score, stock_score, rating_score, speed_score, urgency_score
            )

            ml_score = ml_service.predict_match_score(
                request=request,
                vendor=vendor,
                inventory_item=inventory_item,
                distance_km=distance,
                db=db,
            )

            final_score = rule_based_score
            if ml_score is not None:
                final_score = round((0.75 * rule_based_score) + (0.25 * ml_score), 2)

            candidates.append({
                "vendor": vendor,
                "distance": distance,
                "distance_score": distance_score,
                "stock_score": stock_score,
                "rating_score": rating_score,
                "speed_score": speed_score,
                "urgency_score": urgency_score,
                "rule_score": round(rule_based_score, 2),
                "ml_score": None if ml_score is None else round(ml_score, 2),
                "final_score": final_score,
                "eta": vendor.avg_response_time,
            })

        # Step 5: Sort by final score (descending)
        candidates.sort(key=lambda x: x["final_score"], reverse=True)

        return candidates

    def get_match_results(self, candidates: List[dict], request_id: int = None) -> List[MatchResultWithVendor]:
        """
        Format candidates into MatchResultWithVendor objects for API response.
        """
        results = []
        for rank, candidate in enumerate(candidates, start=1):
            vendor = candidate["vendor"]
            result = MatchResultWithVendor(
                rank=rank,
                vendor_id=vendor.id,
                vendor_name=vendor.shop_name,
                category=vendor.category,
                distance=round(candidate["distance"], 2),
                eta=candidate["eta"],
                score=round(candidate["final_score"], 2),
                rating=round(vendor.rating, 2),
            )
            results.append(result)
        return results
