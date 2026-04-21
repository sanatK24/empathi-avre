from typing import List, Dict, Any, TypeVar, Generic
from ml.predict import RankerInference
from ml.features import FeatureEngine
from core.logging import logger

T = TypeVar('T')

class RankingService:
    _inference = None

    @classmethod
    def get_inference(cls):
        if cls._inference is None:
            cls._inference = RankerInference()
        return cls._inference

    @staticmethod
    def rank_vendors(request: Any, candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        ranks vendors for a specific request.
        candidates expected to have: {"vendor": VendorObj, "inventory": InventoryObj}
        """
        if not candidates:
            return []

        # 1. Build Feature Vectors
        features_list = []
        for c in candidates:
            features = FeatureEngine.build_request_features(request, c["vendor"], c["inventory"])
            features_list.append(features)

        # 2. Get ML Scores
        inference = RankingService.get_inference()
        ml_scores = inference.predict_scores(features_list)

        from config import settings
        
        # 3. Zip and Sort
        for i, c in enumerate(candidates):
            score = float(ml_scores[i]) if ml_scores is not None else settings.DEFAULT_ML_SCORE
            # We normalize score to 0-100 range if it's LambdaRank raw output (approx)
            # For simplicity, we just use it for sorting
            c["ml_score"] = score
            c["relevance_score"] = round(score * 10, 2) if ml_scores is not None else (settings.DEFAULT_ML_SCORE * 100)

        # Sort by ML score descending
        candidates.sort(key=lambda x: x["ml_score"], reverse=True)
        
        return candidates

    @staticmethod
    def rank_campaigns(user: Any, campaigns: List[Any]) -> List[Any]:
        if not campaigns:
            return []

        features_list = [FeatureEngine.build_campaign_features(c, user) for c in campaigns]
        
        inference = RankingService.get_inference()
        ml_scores = inference.predict_scores(features_list)
        
        results = []
        for i, c in enumerate(campaigns):
            score = float(ml_scores[i]) if ml_scores is not None else 0.0
            setattr(c, "matching_score", score)
            results.append(c)
            
        results.sort(key=lambda x: x.matching_score, reverse=True)
        return results
