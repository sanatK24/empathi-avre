from __future__ import annotations

import math
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from models import Inventory, Match, MatchStatus, Request, UrgencyLevel, Vendor

try:
    import joblib
except ImportError:  # pragma: no cover - handled by runtime fallback
    joblib = None

try:
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.impute import SimpleImputer
    from sklearn.pipeline import Pipeline
except ImportError:  # pragma: no cover - handled by runtime fallback
    RandomForestRegressor = None
    SimpleImputer = None
    Pipeline = None


@dataclass(frozen=True)
class MLTrainResult:
    trained: bool
    samples_used: int
    message: str


class AVREMLService:
    """Optional ML layer for AVRE vendor scoring.

    The service trains a regression model on historical matches when enough
    labeled data exists. If the runtime dependencies are missing or there is
    insufficient data, the service cleanly falls back to the rule-based engine.
    """

    feature_names = [
        "distance_km",
        "stock_ratio",
        "vendor_rating",
        "avg_response_time",
        "urgency_level",
        "category_match",
        "vendor_active",
    ]

    def __init__(self) -> None:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.artifacts_dir = os.path.join(base_dir, "ml_artifacts")
        self.model_path = os.path.join(self.artifacts_dir, "avre_model.joblib")
        self.metadata_path = os.path.join(self.artifacts_dir, "avre_model_metadata.json")
        self.model: Optional[Any] = None
        self.metadata: Dict[str, Any] = {
            "trained_at": None,
            "samples_used": 0,
            "feature_names": list(self.feature_names),
            "model_type": None,
        }
        self._ensure_artifact_dir()
        self.load_model()

    def _ensure_artifact_dir(self) -> None:
        os.makedirs(self.artifacts_dir, exist_ok=True)

    @staticmethod
    def _normalize_text(value: Optional[str]) -> str:
        return (value or "").strip().lower()

    @staticmethod
    def _urgency_to_numeric(urgency: Any) -> float:
        if isinstance(urgency, UrgencyLevel):
            urgency_value = urgency.value
        else:
            urgency_value = str(urgency or "").strip().lower()

        mapping = {
            "low": 0.0,
            "medium": 0.0,
            "high": 75.0,
            "critical": 100.0,
        }
        return mapping.get(urgency_value, 0.0)

    @staticmethod
    def _category_match(resource_name: str, vendor_category: str) -> float:
        resource = AVREMLService._normalize_text(resource_name)
        category = AVREMLService._normalize_text(vendor_category)

        if not resource or not category:
            return 0.0

        if resource == category:
            return 100.0

        if resource in category or category in resource:
            return 75.0

        resource_tokens = set(resource.replace("/", " ").replace("-", " ").split())
        category_tokens = set(category.replace("/", " ").replace("-", " ").split())
        if resource_tokens & category_tokens:
            return 50.0

        return 0.0

    @staticmethod
    def _haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        radius_km = 6371.0
        delta_lat = math.radians(lat2 - lat1)
        delta_lng = math.radians(lng2 - lng1)
        a = (
            math.sin(delta_lat / 2) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(delta_lng / 2) ** 2
        )
        return radius_km * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    def _ensure_model_runtime(self) -> bool:
        return joblib is not None and RandomForestRegressor is not None and SimpleImputer is not None and Pipeline is not None

    def load_model(self) -> bool:
        if joblib is None or not os.path.exists(self.model_path):
            return False

        payload = joblib.load(self.model_path)
        self.model = payload.get("model")
        self.metadata.update(payload.get("metadata", {}))
        return self.model is not None

    def save_model(self) -> None:
        if joblib is None or self.model is None:
            return

        payload = {
            "model": self.model,
            "metadata": self.metadata,
        }
        joblib.dump(payload, self.model_path)
        with open(self.metadata_path, "w", encoding="utf-8") as metadata_file:
            import json

            json.dump(self.metadata, metadata_file, indent=2)

    def _build_feature_vector(
        self,
        request: Request,
        vendor: Vendor,
        inventory_item: Inventory,
        distance_km: float,
    ) -> List[float]:
        stock_ratio = inventory_item.quantity / max(request.quantity, 1)
        return [
            round(distance_km, 6),
            round(stock_ratio, 6),
            float(vendor.rating or 0.0),
            float(vendor.avg_response_time or 0),
            self._urgency_to_numeric(request.urgency),
            self._category_match(request.resource_name, vendor.category),
            100.0 if vendor.is_active else 0.0,
        ]

    def _collect_training_examples(self, db: Session) -> List[Dict[str, Any]]:
        examples: List[Dict[str, Any]] = []
        labeled_statuses = {
            MatchStatus.ACCEPTED_BY_REQUESTER,
            MatchStatus.ACCEPTED_BY_VENDOR,
            MatchStatus.COMPLETED,
            MatchStatus.REJECTED_BY_VENDOR,
        }

        matches = db.query(Match).filter(Match.status.in_(list(labeled_statuses))).all()
        for match in matches:
            request = match.request
            vendor = match.vendor
            if not request or not vendor:
                continue

            inventory_item = db.query(Inventory).filter(
                Inventory.vendor_id == vendor.id,
                Inventory.resource_name == request.resource_name,
            ).first()
            if not inventory_item:
                continue

            distance_km = self._haversine_distance(
                request.latitude,
                request.longitude,
                vendor.latitude,
                vendor.longitude,
            )
            features = self._build_feature_vector(request, vendor, inventory_item, distance_km)
            target = 100.0 if match.status != MatchStatus.REJECTED_BY_VENDOR else 0.0

            examples.append(
                {
                    "features": features,
                    "target": target,
                }
            )

        return examples

    def train_from_db(self, db: Session, min_samples: int = 20) -> MLTrainResult:
        if not self._ensure_model_runtime():
            return MLTrainResult(False, 0, "scikit-learn or joblib is not available")

        examples = self._collect_training_examples(db)
        if len(examples) < min_samples:
            return MLTrainResult(False, len(examples), "insufficient labeled matches for training")

        features = [example["features"] for example in examples]
        targets = [example["target"] for example in examples]

        self.model = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median")),
                (
                    "regressor",
                    RandomForestRegressor(
                        n_estimators=200,
                        random_state=42,
                        min_samples_leaf=2,
                    ),
                ),
            ]
        )
        self.model.fit(features, targets)
        self.metadata = {
            "trained_at": datetime.utcnow().isoformat(),
            "samples_used": len(examples),
            "feature_names": list(self.feature_names),
            "model_type": "RandomForestRegressor",
        }
        self.save_model()
        return MLTrainResult(True, len(examples), "model trained successfully")

    def ensure_model(self, db: Optional[Session] = None) -> bool:
        if self.model is not None:
            return True

        if self.load_model():
            return True

        if db is None:
            return False

        train_result = self.train_from_db(db)
        return train_result.trained

    def predict_match_score(
        self,
        request: Request,
        vendor: Vendor,
        inventory_item: Inventory,
        distance_km: float,
        db: Optional[Session] = None,
    ) -> Optional[float]:
        if not self.ensure_model(db=db):
            return None

        features = self._build_feature_vector(request, vendor, inventory_item, distance_km)
        if self.model is None:
            return None

        predicted_score = float(self.model.predict([features])[0])
        return max(0.0, min(100.0, predicted_score))

    def status(self) -> Dict[str, Any]:
        return {
            "available": self.model is not None,
            "model_path": self.model_path,
            "metadata": self.metadata,
        }


ml_service = AVREMLService()