import os
import pickle
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional

class RankerInference:
    def __init__(self, artifacts_dir: str = "ml_artifacts"):
        self.model_path = os.path.join(artifacts_dir, "ranker_model.pkl")
        self.features_path = os.path.join(artifacts_dir, "feature_names.pkl")
        self.model = None
        self.feature_names = None
        self._load_assets()

    def _load_assets(self):
        # Search paths: exact model_path, backend/model_path, or parent/model_path
        paths_to_check = [
            (self.model_path, self.features_path),
            (os.path.join("backend", self.model_path), os.path.join("backend", self.features_path)),
            (os.path.join("..", self.model_path), os.path.join("..", self.features_path)),
            (os.path.join("backend/ml", "model.pkl"), None)  # Try RF as deep fallback
        ]
        
        for m_path, f_path in paths_to_check:
            if os.path.exists(m_path):
                try:
                    with open(m_path, "rb") as f:
                        self.model = pickle.load(f)
                    
                    if f_path and os.path.exists(f_path):
                        with open(f_path, "rb") as f:
                            self.feature_names = pickle.load(f)
                    else:
                        # Fallback feature list for RandomForest if loaded as model.pkl
                        self.feature_names = [
                            "distance_km", "stock_ratio", "vendor_rating", "reliability_score",
                            "avg_response_time", "category_match", "urgency_level", "freshness_score", "price"
                        ]
                    print(f"Loaded Ranker Model from {m_path}")
                    return
                except Exception as e:
                    print(f"Failed loading candidate model from {m_path}: {e}")

    def predict_scores(self, features_list: List[Dict[str, float]]) -> Optional[np.ndarray]:
        if not self.model or not features_list:
            return None
            
        # Align features
        df = pd.DataFrame(features_list)
        # Handle missing feature columns by filling with 0
        for col in self.feature_names:
            if col not in df.columns:
                df[col] = 0.0
                
        # Reorder to match training
        X = df[self.feature_names]
        
        try:
            return self.model.predict(X)
        except Exception as e:
            print(f"Inference error: {e}")
            return None
