from __future__ import annotations

import math
import os
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


URGENCY_LEVEL_MAP: Dict[str, int] = {
    "low": 1,
    "medium": 2,
    "high": 3,
    "critical": 4,
}

RESOURCE_CATALOG: Dict[str, str] = {
    "oxygen cylinder": "medical",
    "oxygen": "medical",
    "medicine": "pharmacy",
    "paracetamol": "pharmacy",
    "antibiotics": "pharmacy",
    "first aid kit": "medical",
    "food": "grocery",
    "water": "grocery",
    "baby formula": "grocery",
    "shelter": "support",
    "transport": "transport",
}

VENDOR_CATEGORIES = ["medical", "pharmacy", "grocery", "support", "transport"]


@dataclass(frozen=True)
class PreprocessingResult:
    features: pd.DataFrame
    target: pd.Series
    feature_names: List[str]
    preprocessor: ColumnTransformer


class AVREDatasetPipeline:
    """Synthetic AVRE dataset generation and preprocessing utilities.

    This covers the implementation guide through preprocessing:
    - synthetic request-vendor pair generation
    - target score creation from business logic
    - missing-value handling
    - urgency encoding
    - feature engineering
    - one-hot encoding for categorical fields
    """

    def __init__(self, seed: int = 42) -> None:
        self.seed = seed
        self.rng = np.random.default_rng(seed)

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

    def _pick_resource(self) -> Tuple[str, str]:
        resource_name = self.rng.choice(list(RESOURCE_CATALOG.keys()))
        return resource_name, RESOURCE_CATALOG[resource_name]

    def _build_vendor_pool(self, num_vendors: int) -> List[Dict[str, object]]:
        vendors: List[Dict[str, object]] = []
        for vendor_id in range(1, num_vendors + 1):
            category = str(self.rng.choice(VENDOR_CATEGORIES))
            vendors.append(
                {
                    "vendor_id": vendor_id,
                    "vendor_category": category,
                    "vendor_rating": round(float(self.rng.uniform(2.5, 5.0)), 2),
                    "avg_response_time": int(self.rng.integers(5, 60)),
                    "active_status": int(self.rng.random() > 0.1),
                    "delivery_capacity": int(self.rng.integers(20, 250)),
                    "past_success_rate": round(float(self.rng.uniform(0.35, 0.98)), 2),
                    "latitude": round(float(self.rng.uniform(18.8, 19.3)), 6),
                    "longitude": round(float(self.rng.uniform(72.7, 73.1)), 6),
                    "price_base": round(float(self.rng.uniform(20.0, 250.0)), 2),
                }
            )
        return vendors

    def _build_request_pool(self, num_requests: int) -> List[Dict[str, object]]:
        requests: List[Dict[str, object]] = []
        for request_id in range(1, num_requests + 1):
            resource_name, resource_category = self._pick_resource()
            requests.append(
                {
                    "request_id": request_id,
                    "resource_name": resource_name,
                    "resource_category": resource_category,
                    "required_quantity": int(self.rng.integers(1, 50)),
                    "urgency_level": str(self.rng.choice(["low", "medium", "high", "critical"], p=[0.25, 0.35, 0.25, 0.15])),
                    "latitude": round(float(self.rng.uniform(18.8, 19.3)), 6),
                    "longitude": round(float(self.rng.uniform(72.7, 73.1)), 6),
                    "hour_of_day": int(self.rng.integers(0, 24)),
                    "day_of_week": int(self.rng.integers(0, 7)),
                }
            )
        return requests

    def _urgency_bonus(self, urgency_level: str) -> float:
        return {
            "low": 0.0,
            "medium": 8.0,
            "high": 18.0,
            "critical": 30.0,
        }.get(str(urgency_level).strip().lower(), 0.0)

    def _create_match_score(self, row: Dict[str, object]) -> float:
        distance_km = float(row["distance_km"])
        stock_quantity = float(row["stock_quantity"])
        required_quantity = float(row["required_quantity"])
        vendor_rating = float(row["vendor_rating"])
        avg_response_time = float(row["avg_response_time"])
        urgency_level = str(row["urgency_level"])
        category_match = float(row["category_match"])
        price = float(row["price"])
        active_status = float(row["active_status"])
        past_success_rate = float(row["past_success_rate"])
        delivery_capacity = float(row["delivery_capacity"])
        hour_of_day = float(row["hour_of_day"])
        day_of_week = float(row["day_of_week"])

        distance_score = max(0.0, 100.0 * (1.0 / (distance_km + 1.0)))
        stock_score = min(100.0, (stock_quantity / max(required_quantity, 1.0)) * 100.0)
        rating_score = (vendor_rating / 5.0) * 100.0
        speed_score = max(0.0, 100.0 * (1.0 - (avg_response_time / 60.0)))
        urgency_score = self._urgency_bonus(urgency_level)
        price_score = max(0.0, 100.0 - min(price / 3.0, 100.0))
        capacity_score = min(100.0, (delivery_capacity / 250.0) * 100.0)
        success_score = past_success_rate * 100.0

        operational_bonus = 0.0
        if active_status >= 1.0:
            operational_bonus += 8.0
        if category_match >= 1.0:
            operational_bonus += 3.0
        if stock_quantity >= required_quantity:
            operational_bonus += 8.0

        time_signal = 0.0
        if 6 <= hour_of_day <= 10:
            time_signal += 3.0
        if day_of_week in {5, 6}:
            time_signal -= 2.0

        raw_score = (
            0.33 * distance_score
            + 0.24 * stock_score
            + 0.15 * rating_score
            + 0.17 * speed_score
            + 0.08 * urgency_score
            + 0.01 * price_score
            + 0.00 * capacity_score
            + 0.00 * success_score
            + operational_bonus
            + time_signal
        )
        noisy_score = raw_score + float(self.rng.normal(0.0, 3.0))
        return round(float(np.clip(noisy_score, 0.0, 100.0)), 2)

    def generate_synthetic_dataset(
        self,
        num_rows: int = 5000,
        num_vendors: int = 100,
        num_requests: int = 500,
    ) -> pd.DataFrame:
        vendors = self._build_vendor_pool(num_vendors)
        requests = self._build_request_pool(num_requests)

        rows: List[Dict[str, object]] = []
        for _ in range(num_rows):
            vendor = vendors[int(self.rng.integers(0, len(vendors)))]
            request = requests[int(self.rng.integers(0, len(requests)))]

            distance_km = self._haversine_distance(
                float(request["latitude"]),
                float(request["longitude"]),
                float(vendor["latitude"]),
                float(vendor["longitude"]),
            )

            required_quantity = int(request["required_quantity"])
            stock_quantity = int(
                max(
                    0,
                    self.rng.normal(
                        loc=float(vendor["delivery_capacity"]) * 0.65,
                        scale=max(float(vendor["delivery_capacity"]) * 0.2, 5.0),
                    ),
                )
            )
            category_match = int(request["resource_category"] == vendor["vendor_category"])
            price = round(
                max(1.0, float(vendor["price_base"]) * (0.75 + float(self.rng.random()) * 0.75)),
                2,
            )

            row: Dict[str, object] = {
                "request_id": int(request["request_id"]),
                "vendor_id": int(vendor["vendor_id"]),
                "resource_category": request["resource_category"],
                "vendor_category": vendor["vendor_category"],
                "distance_km": round(float(distance_km), 4),
                "stock_quantity": stock_quantity,
                "required_quantity": required_quantity,
                "vendor_rating": float(vendor["vendor_rating"]),
                "avg_response_time": int(vendor["avg_response_time"]),
                "urgency_level": request["urgency_level"],
                "category_match": category_match,
                "price": price,
                "active_status": int(vendor["active_status"]),
                "past_success_rate": float(vendor["past_success_rate"]),
                "delivery_capacity": int(vendor["delivery_capacity"]),
                "hour_of_day": int(request["hour_of_day"]),
                "day_of_week": int(request["day_of_week"]),
            }
            row["match_score"] = self._create_match_score(row)
            rows.append(row)

        return pd.DataFrame(rows)

    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        frame = df.copy()

        required_columns = {
            "distance_km": 0.0,
            "stock_quantity": 0,
            "required_quantity": 1,
            "vendor_rating": 0.0,
            "avg_response_time": 0,
            "urgency_level": "medium",
            "category_match": 0,
            "price": 0.0,
            "active_status": 1,
            "past_success_rate": 0.0,
            "delivery_capacity": 0,
            "hour_of_day": 12,
            "day_of_week": 0,
            "resource_category": "unknown",
            "vendor_category": "unknown",
        }

        for column_name, default_value in required_columns.items():
            if column_name not in frame.columns:
                frame[column_name] = default_value

        numeric_fillers = {
            "distance_km": frame["distance_km"].median(),
            "stock_quantity": 0,
            "required_quantity": max(1, int(frame["required_quantity"].median()) if not frame["required_quantity"].isna().all() else 1),
            "vendor_rating": frame["vendor_rating"].mean(),
            "avg_response_time": int(frame["avg_response_time"].median()) if not frame["avg_response_time"].isna().all() else 0,
            "category_match": 0,
            "price": frame["price"].median(),
            "active_status": 1,
            "past_success_rate": frame["past_success_rate"].mean(),
            "delivery_capacity": int(frame["delivery_capacity"].median()) if not frame["delivery_capacity"].isna().all() else 0,
            "hour_of_day": int(frame["hour_of_day"].median()) if not frame["hour_of_day"].isna().all() else 12,
            "day_of_week": int(frame["day_of_week"].median()) if not frame["day_of_week"].isna().all() else 0,
        }

        for column_name, filler in numeric_fillers.items():
            frame[column_name] = frame[column_name].fillna(filler)

        frame["urgency_level"] = frame["urgency_level"].astype(str).str.strip().str.lower().map(URGENCY_LEVEL_MAP).fillna(2).astype(int)
        frame["resource_category"] = frame["resource_category"].astype(str).str.strip().str.lower().fillna("unknown")
        frame["vendor_category"] = frame["vendor_category"].astype(str).str.strip().str.lower().fillna("unknown")

        frame["stock_ratio"] = np.where(
            frame["required_quantity"].replace(0, np.nan).isna(),
            0.0,
            frame["stock_quantity"] / frame["required_quantity"].replace(0, np.nan),
        )
        frame["stock_ratio"] = frame["stock_ratio"].replace([np.inf, -np.inf], 0).fillna(0.0)
        frame["speed_score"] = 1.0 / (frame["avg_response_time"].astype(float) + 1.0)
        frame["distance_score"] = 1.0 / (frame["distance_km"].astype(float) + 1.0)
        frame["is_sufficient_stock"] = (frame["stock_quantity"].astype(float) >= frame["required_quantity"].astype(float)).astype(int)

        return frame

    def build_preprocessor(self, feature_frame: pd.DataFrame) -> ColumnTransformer:
        categorical_features = [
            column_name
            for column_name in ["resource_category", "vendor_category"]
            if column_name in feature_frame.columns
        ]

        numeric_features = [
            column_name
            for column_name in feature_frame.columns
            if column_name not in categorical_features and column_name != "match_score"
        ]

        numeric_pipeline = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median")),
            ]
        )
        categorical_pipeline = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
            ]
        )

        return ColumnTransformer(
            transformers=[
                ("numeric", numeric_pipeline, numeric_features),
                ("categorical", categorical_pipeline, categorical_features),
            ],
            remainder="drop",
            verbose_feature_names_out=False,
        )

    def preprocess_dataset(self, df: pd.DataFrame) -> PreprocessingResult:
        feature_frame = self.engineer_features(df)
        target = feature_frame["match_score"].astype(float) if "match_score" in feature_frame.columns else pd.Series(dtype=float)
        feature_frame = feature_frame.drop(columns=["match_score"], errors="ignore")

        preprocessor = self.build_preprocessor(feature_frame)
        transformed = preprocessor.fit_transform(feature_frame)
        feature_names = list(preprocessor.get_feature_names_out())
        processed_features = pd.DataFrame(transformed, columns=feature_names)

        return PreprocessingResult(
            features=processed_features,
            target=target,
            feature_names=feature_names,
            preprocessor=preprocessor,
        )

    def save_dataset(
        self,
        df: pd.DataFrame,
        output_path: Optional[str] = None,
    ) -> str:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        dataset_dir = os.path.join(base_dir, "dataset")
        os.makedirs(dataset_dir, exist_ok=True)

        if output_path is None:
            output_path = os.path.join(dataset_dir, "avre_synthetic_dataset.csv")

        df.to_csv(output_path, index=False)
        return output_path

    def pipeline_summary(self, df: pd.DataFrame) -> Dict[str, object]:
        preprocessed = self.preprocess_dataset(df)
        return {
            "rows": int(preprocessed.features.shape[0]),
            "feature_count": int(preprocessed.features.shape[1]),
            "feature_names": preprocessed.feature_names,
            "target_min": float(preprocessed.target.min()) if len(preprocessed.target) else 0.0,
            "target_max": float(preprocessed.target.max()) if len(preprocessed.target) else 0.0,
            "target_mean": float(preprocessed.target.mean()) if len(preprocessed.target) else 0.0,
        }


def generate_avre_synthetic_dataset(
    num_rows: int = 5000,
    num_vendors: int = 100,
    num_requests: int = 500,
    seed: int = 42,
) -> pd.DataFrame:
    return AVREDatasetPipeline(seed=seed).generate_synthetic_dataset(
        num_rows=num_rows,
        num_vendors=num_vendors,
        num_requests=num_requests,
    )


def preprocess_avre_dataset(df: pd.DataFrame, seed: int = 42) -> PreprocessingResult:
    return AVREDatasetPipeline(seed=seed).preprocess_dataset(df)
