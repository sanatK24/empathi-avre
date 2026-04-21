import os
import pickle
import lightgbm as lgb
import numpy as np
from datasets import RankingDataset
from sklearn.metrics import ndcg_score

def train_ranker():
    print("--- EMPathI ML: Training Shared Ranker ---")
    
    # 1. Load Data
    ds = RankingDataset()
    X, y, groups = ds.get_training_data()
    
    if len(X) < 10:
        print("Not enough data for training. Using fallback model.")
        return
        
    group_sizes = ds.get_group_sizes(groups)
    
    # 2. Configure Ranker
    # Use LambdaRank for list-wise ranking optimization
    ranker = lgb.LGBMRanker(
        objective="lambdarank",
        metric="ndcg",
        n_estimators=100,
        learning_rate=0.05,
        importance_type='gain'
    )
    
    # 3. Fit
    ranker.fit(
        X, y,
        group=group_sizes,
        eval_at=[1, 3, 5]
    )
    
    # 4. Save Artifacts
    os.makedirs("ml_artifacts", exist_ok=True)
    with open("ml_artifacts/ranker_model.pkl", "wb") as f:
        pickle.dump(ranker, f)
        
    # Save feature names for inference alignment
    with open("ml_artifacts/feature_names.pkl", "wb") as f:
        pickle.dump(list(X.columns), f)
        
    print(f"Model saved to ml_artifacts/ranker_model.pkl")
    print(f"Feature importance: {dict(zip(X.columns, ranker.feature_importances_))}")

if __name__ == "__main__":
    train_ranker()
