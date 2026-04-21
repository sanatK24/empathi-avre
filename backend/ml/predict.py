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
        try:
            if os.path.exists(self.model_path):
                with open(self.model_path, "rb") as f:
                    self.model = pickle.load(f)
                with open(self.features_path, "rb") as f:
                    self.feature_names = pickle.load(f)
                print(f"Loaded Ranker Model from {self.model_path}")
        except Exception as e:
            print(f"Failed to load ML Ranker: {e}")

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
