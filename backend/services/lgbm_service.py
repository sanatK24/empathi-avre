import os
import pickle
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from models import Request, Vendor, Inventory
from config import settings, BASE_DIR
from services.feature_store import FeatureStore
from services.feature_builder import FeatureBuilder

class LGBMService:
    def __init__(self, artifacts_dir: str = "ml_artifacts", fallback_dir: str = "backend/ml"):
        self.artifacts_dir = artifacts_dir
        self.fallback_dir = fallback_dir
        
        self.lgbm_model_path = os.path.join(artifacts_dir, "ranker_model.pkl")
        self.lgbm_features_path = os.path.join(artifacts_dir, "feature_names.pkl")
        self.rf_model_path = os.path.join(fallback_dir, "model.pkl")
        
        self.lgbm_model = None
        self.lgbm_feature_names = None
        
        self.rf_model = None
        self.rf_feature_names = [
            "distance_km", "stock_ratio", "vendor_rating", "reliability_score",
            "avg_response_time", "category_match", "urgency_level", "freshness_score", "price"
        ]
        
        self.load_assets()

    def load_assets(self):
        """
        Loads both LightGBM assets and RandomForest assets if they are present.
        """
        # LightGBM search paths
        workspace_root = os.path.dirname(BASE_DIR)
        lgbm_paths = [
            (self.lgbm_model_path, self.lgbm_features_path),
            (os.path.join("backend", self.lgbm_model_path), os.path.join("backend", self.lgbm_features_path)),
            (os.path.join("..", self.lgbm_model_path), os.path.join("..", self.lgbm_features_path)),
            (os.path.join(workspace_root, "ml_artifacts", "ranker_model.pkl"), os.path.join(workspace_root, "ml_artifacts", "feature_names.pkl"))
        ]

        # Load LightGBM model
        for m_path, f_path in lgbm_paths:
            if os.path.exists(m_path) and os.path.exists(f_path):
                try:
                    with open(m_path, "rb") as f:
                        self.lgbm_model = pickle.load(f)
                    with open(f_path, "rb") as f:
                        self.lgbm_feature_names = pickle.load(f)
                    print(f"[LGBMService] Loaded LightGBM Ranker from {m_path}")
                    break
                except Exception as e:
                    print(f"[LGBMService] Failed loading LightGBM from {m_path}: {e}")

        # RandomForest search paths
        rf_paths = [
            self.rf_model_path,
            os.path.join("backend", self.rf_model_path),
            os.path.join("..", self.rf_model_path),
            os.path.join(BASE_DIR, "ml", "model.pkl"),
            "ml/model.pkl",
            "backend/ml/model.pkl",
            "../backend/ml/model.pkl"
        ]

        # Load RandomForest fallback model
        for rf_path in rf_paths:
            if os.path.exists(rf_path):
                try:
                    with open(rf_path, "rb") as f:
                        self.rf_model = pickle.load(f)
                    print(f"[LGBMService] Loaded fallback RandomForest from {rf_path}")
                    break
                except Exception as e:
                    print(f"[LGBMService] Failed loading RandomForest from {rf_path}: {e}")

    def is_lgbm_loaded(self) -> bool:
        return self.lgbm_model is not None and self.lgbm_feature_names is not None

    def predict_lgbm(self, features_list: List[Dict[str, float]]) -> List[float]:
        """
        Computes LightGBM ranker scores.
        """
        if not self.is_lgbm_loaded() or not features_list:
            raise ValueError("LightGBM is not initialized.")
            
        df = pd.DataFrame(features_list)
        # Pad missing columns with 0.0
        for col in self.lgbm_feature_names:
            if col not in df.columns:
                df[col] = 0.0
                
        # Reorder to match training structure
        X = df[self.lgbm_feature_names]
        
        # LightGBM predict
        raw_scores = self.lgbm_model.predict(X)
        return [float(s) for s in raw_scores]

    def predict_rf(self, rf_features_list: List[Dict[str, Any]]) -> List[float]:
        """
        Computes RandomForest fallback scores.
        """
        if not self.rf_model:
            raise ValueError("RandomForest fallback model not loaded.")
            
        all_values = []
        for features in rf_features_list:
            # Map features according to RF feature order
            values = [features.get(name, 0.0) for name in self.rf_feature_names]
            all_values.append(values)
            
        predictions = self.rf_model.predict(all_values)
        return [float(p) for p in predictions]

    def score_candidates(
        self,
        request: Request,
        candidates: List[Dict[str, Any]]
    ) -> Tuple[List[float], str, List[Dict[str, float]]]:
        """
        Scores a list of candidates.
        Candidates contains dicts of: {"vendor": Vendor, "inventory": Inventory, "distance_km": float}
        Returns:
            - A list of scores (floats)
            - The name of the model used (string: "LightGBM", "RandomForest", or "Heuristic Fallback")
            - A list of engineered features used for training or future logging
        """
        if not candidates:
            return [], "Heuristic Fallback", []

        # 1. Build features using modern FeatureStore
        features_list = FeatureStore.vectorize_batch(request, candidates)

        # 2. Try LightGBM Ranker
        if self.is_lgbm_loaded():
            try:
                scores = self.predict_lgbm(features_list)
                return scores, "LightGBM", features_list
            except Exception as e:
                print(f"[LGBMService] Failed running LightGBM inference, trying RF fallback: {e}")

        # 3. Try RandomForest Fallback
        if self.rf_model is not None:
            try:
                # Build RF features using the old FeatureBuilder
                rf_features = []
                for c in candidates:
                    vendor = c["vendor"]
                    inventory = c.get("inventory")
                    success_rate = vendor.reliability_score if vendor.reliability_score is not None else 0.8
                    features = FeatureBuilder.build_features(request, vendor, inventory, success_rate=success_rate)
                    features["distance_km"] = c.get("distance_km", 15.0)
                    rf_features.append(features)
                
                scores = self.predict_rf(rf_features)
                return scores, "RandomForest", features_list
            except Exception as e:
                print(f"[LGBMService] Failed running RandomForest fallback: {e}")

        # 4. Heuristic fallback (if no models loaded or inference failed)
        scores = []
        for features in features_list:
            # Simple heuristic formula matching the core logic
            score = (
                0.3 * features["proximity_score"] +
                0.2 * features["availability_score"] +
                0.2 * features["vendor_rating"] / 5.0 +
                0.2 * features["success_rate"] +
                0.1 * features["freshness_score"]
            )
            scores.append(score)
            
        return scores, "Heuristic Fallback", features_list
