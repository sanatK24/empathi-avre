import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from typing import Tuple, List

class RankingDataset:
    def __init__(self, db_url: str = "sqlite:///avre.db"):
        self.engine = create_engine(db_url)

    def get_training_data(self) -> Tuple[pd.DataFrame, np.ndarray, np.ndarray]:
        """
        Builds a dataset for ranking.
        Each group is a Request ID.
        Labels: 3 for COMPLETED, 2 for ACCEPTED, 1 for PENDING (seen), 0 for not matched.
        """
        query = """
        SELECT 
            m.request_id as group_id,
            m.score as heur_score,
            m.status as match_status,
            r.category as req_cat,
            r.urgency_level as req_urgency,
            v.category as ven_cat,
            v.rating as ven_rating,
            v.reliability_score as ven_rel,
            v.avg_response_time as ven_speed
        FROM matches m
        JOIN requests r ON m.request_id = r.id
        JOIN vendors v ON m.vendor_id = v.id
        """
        df = pd.read_sql(query, self.engine)
        
        # Mapping statuses to relevance labels
        label_map = {
            "completed": 5,
            "accepted_by_requester": 4,
            "accepted_by_vendor": 2,
            "pending": 1
        }
        df["label"] = df["match_status"].map(lambda x: label_map.get(x, 0))
        
        # Mock features (in a real system, we'd use the FeatureEngine to re-generate from data)
        # For simplicity in this refactor, we'll use some raw columns
        X = pd.DataFrame({
            "ven_rating": df["ven_rating"],
            "ven_rel": df["ven_rel"],
            "ven_speed": df["ven_speed"],
            "cat_match": (df["req_cat"] == df["ven_cat"]).astype(float),
            "heur_score": df["heur_score"]
        })
        
        return X, df["label"].values, df["group_id"].values

    @staticmethod
    def get_group_sizes(groups: np.ndarray) -> List[int]:
        if len(groups) == 0:
            return []
        
        # Count consecutive identical group_ids
        sizes = []
        current_group = groups[0]
        count = 0
        for group in groups:
            if group == current_group:
                count += 1
            else:
                sizes.append(count)
                current_group = group
                count = 1
        sizes.append(count)
        return sizes
