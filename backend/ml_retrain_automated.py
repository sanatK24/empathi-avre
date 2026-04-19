import os
import pickle
import json
import pandas as pd
import numpy as np
from ml_process import get_data, feature_engineering, train_and_tune, ndcg_calc
from datetime import datetime

# Paths
OLD_MODEL_PATH = "ml/model.pkl"
NEW_MODEL_PATH = "ml/model_candidate.pkl"
ARTIFACTS_DIR = "ml_artifacts"

def automated_retrain():
    print(f"--- AUTOMATED RETRAINING SESSION: {datetime.now()} ---")
    
    # 1. Load Data and Engineer Features
    m, v, r, i = get_data()
    X, y, groups, feat_names = feature_engineering(m, v, r, i)
    
    # 2. Train and Tune New Model
    best_candidate_model, best_candidate_name, leaderboard = train_and_tune(X, y, groups)
    new_ndcg = leaderboard.iloc[0]["ndcg@mean"]
    
    # 3. Load Old Model for Benchmarking
    old_ndcg = 0.0
    if os.path.exists(OLD_MODEL_PATH):
        try:
            with open(OLD_MODEL_PATH, "rb") as f:
                old_model = pickle.load(f)
            # Evaluate old model on current data
            old_preds = old_model.predict(X)
            old_ndcg = ndcg_calc(y.values, old_preds, groups.values)
            print(f"Current Model NDCG: {old_ndcg:.4f}")
        except Exception as e:
            print(f"Error evaluating old model: {e}")
            old_ndcg = 0.0
    
    print(f"New Candidate ({best_candidate_name}) NDCG: {new_ndcg:.4f}")
    
    # 4. Promotion Logic (from retraining_strategy.md)
    # NDCG@3 >= Old - 0.02
    threshold = old_ndcg - 0.02
    
    promotion_status = "REJECTED"
    if new_ndcg >= threshold:
        promotion_status = "PROMOTED"
        # Promotion: Save as model.pkl
        with open(OLD_MODEL_PATH, "wb") as f:
            pickle.dump(best_candidate_model, f)
        print(f"SUCCESS: New model {promotion_status} (Passed threshold {threshold:.4f})")
    else:
        print(f"FAILURE: New model {promotion_status} (Failed threshold {threshold:.4f})")
        
    # 5. Log results
    retrain_log = {
        "timestamp": str(datetime.now()),
        "old_ndcg": old_ndcg,
        "new_ndcg": new_ndcg,
        "threshold": threshold,
        "status": promotion_status,
        "model_type": best_candidate_name
    }
    
    log_path = os.path.join(ARTIFACTS_DIR, "retraining_log.json")
    logs = []
    if os.path.exists(log_path):
        with open(log_path, "r") as f:
            logs = json.load(f)
    
    logs.append(retrain_log)
    with open(log_path, "w") as f:
        json.dump(logs, f, indent=4)
        
if __name__ == "__main__":
    automated_retrain()
