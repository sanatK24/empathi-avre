"""
trust_train.py — Trains XGBoost classifiers + Isolation Forest for Trust Layer (Phase 2).

Trains 3 XGBClassifier models (fulfillment, cancellation, dispute) and
1 IsolationForest anomaly detector on vendor-level features from the DB.

When real data is sparse, synthetic balanced samples are appended so models
can still train meaningfully during early platform lifecycle.

Usage (from project root):
  python backend/ml/trust_train.py

Or from backend/:
  python ml/trust_train.py

Artifacts saved to: ml_artifacts/
  trust_model_fulfillment.pkl
  trust_model_cancellation.pkl
  trust_model_dispute.pkl
  anomaly_model.pkl
  trust_feature_names.pkl
"""

import os
import sys
import pickle
import numpy as np
import pandas as pd

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import BASE_DIR
from ml.trust_datasets import TrustDataset, TRUST_FEATURE_NAMES

# Artifacts directory
ARTIFACTS_DIR = os.path.join(os.path.dirname(BASE_DIR), "ml_artifacts")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

MIN_SAMPLES_FOR_TRAINING = 5  # Minimum real rows before we augment


def generate_synthetic_samples(n: int = 50) -> tuple:
    """
    Generates synthetic but realistic vendor feature rows + labels.
    Used to bootstrap training when real DB data is sparse.
    Biased towards realistic distributions (high fulfillment, low dispute).
    """
    rng = np.random.default_rng(seed=42)

    rows = []
    ful_labels, can_labels, dis_labels = [], [], []

    for _ in range(n):
        rel = rng.uniform(0.5, 1.0)
        is_v = float(rng.choice([0, 1], p=[0.3, 0.7]))
        comp = rng.uniform(0.4, 1.0)
        rej  = rng.uniform(0.0, 0.4)
        orders = rng.integers(0, 200)

        row = {
            "completed_orders":  float(orders),
            "selection_rate":    float(rng.uniform(0.1, 0.8)),
            "avg_match_score":   float(rng.uniform(40.0, 90.0)),
            "rejection_rate":    float(rej),
            "completion_rate":   float(comp),
            "verified":          float(is_v),
            "avg_response_time": float(rng.integers(5, 60)),
            "reliability_score": float(rel),
            "rating":            float(rng.uniform(2.5, 5.0)),
            "days_active":       float(rng.integers(1, 1000)),
            "fairness_penalty":  float(rng.uniform(0.0, 0.3)),
        }
        rows.append(row)
        ful_labels.append(1 if comp > 0.7 or rel > 0.85 else 0)
        can_labels.append(1 if rej > 0.3 else 0)
        dis_labels.append(1 if rej > 0.5 and rel < 0.6 else 0)

    X = pd.DataFrame(rows, columns=TRUST_FEATURE_NAMES)
    labels = {
        "fulfillment":   np.array(ful_labels),
        "cancellation":  np.array(can_labels),
        "dispute":       np.array(dis_labels),
    }
    return X, labels


def train_trust_models():
    print("[TrustTrainer] Loading training data from DB...")
    ds = TrustDataset()
    X_real, labels_real = ds.get_training_data()

    n_real = len(X_real)
    print(f"[TrustTrainer] Real vendor rows: {n_real}")

    # Always augment with synthetic data (helps with class imbalance)
    X_synth, labels_synth = generate_synthetic_samples(n=max(50, MIN_SAMPLES_FOR_TRAINING * 10))
    print(f"[TrustTrainer] Synthetic rows added: {len(X_synth)}")

    if n_real >= MIN_SAMPLES_FOR_TRAINING:
        X = pd.concat([X_real, X_synth], ignore_index=True)
        labels = {
            k: np.concatenate([labels_real[k], labels_synth[k]])
            for k in ["fulfillment", "cancellation", "dispute"]
        }
    else:
        print("[TrustTrainer] Insufficient real data — training on synthetic only.")
        X = X_synth
        labels = labels_synth

    print(f"[TrustTrainer] Total training rows: {len(X)}")
    print(f"[TrustTrainer] Label distributions:")
    for k, v in labels.items():
        print(f"  {k}: {v.sum()} positive / {len(v)} total ({v.mean():.1%} positive)")

    # --- Import XGBoost + IsolationForest ---
    try:
        from xgboost import XGBClassifier
        use_xgb = True
    except ImportError:
        print("[TrustTrainer] xgboost not installed — falling back to GradientBoostingClassifier.")
        from sklearn.ensemble import GradientBoostingClassifier
        use_xgb = False

    from sklearn.ensemble import IsolationForest
    from sklearn.model_selection import cross_val_score
    from sklearn.preprocessing import LabelEncoder

    X_arr = X.values.astype(np.float32)

    models = {}
    for outcome in ["fulfillment", "cancellation", "dispute"]:
        y = labels[outcome]

        if use_xgb:
            clf = XGBClassifier(
                n_estimators=100,
                max_depth=4,
                learning_rate=0.1,
                subsample=0.8,
                colsample_bytree=0.8,
                use_label_encoder=False,
                eval_metric="logloss",
                random_state=42,
                verbosity=0,
            )
        else:
            clf = GradientBoostingClassifier(
                n_estimators=100,
                max_depth=3,
                learning_rate=0.1,
                random_state=42,
            )

        clf.fit(X_arr, y)

        # Cross-validation score (if enough samples)
        if len(X) >= 10:
            scores = cross_val_score(clf, X_arr, y, cv=min(3, len(X)), scoring="roc_auc")
            print(f"  [{outcome}] CV ROC-AUC: {scores.mean():.3f} ± {scores.std():.3f}")
        else:
            print(f"  [{outcome}] Trained (too few samples for CV).")

        models[outcome] = clf

    # --- IsolationForest for anomaly detection ---
    print("[TrustTrainer] Training IsolationForest anomaly detector...")
    anomaly_model = IsolationForest(
        n_estimators=100,
        contamination=0.05,
        random_state=42,
    )
    anomaly_model.fit(X_arr)
    print("[TrustTrainer] IsolationForest trained.")

    # --- Save artifacts ---
    artifact_paths = {
        "trust_model_fulfillment":  os.path.join(ARTIFACTS_DIR, "trust_model_fulfillment.pkl"),
        "trust_model_cancellation": os.path.join(ARTIFACTS_DIR, "trust_model_cancellation.pkl"),
        "trust_model_dispute":      os.path.join(ARTIFACTS_DIR, "trust_model_dispute.pkl"),
        "anomaly_model":            os.path.join(ARTIFACTS_DIR, "anomaly_model.pkl"),
        "trust_feature_names":      os.path.join(ARTIFACTS_DIR, "trust_feature_names.pkl"),
    }

    with open(artifact_paths["trust_model_fulfillment"], "wb") as f:
        pickle.dump(models["fulfillment"], f)
    with open(artifact_paths["trust_model_cancellation"], "wb") as f:
        pickle.dump(models["cancellation"], f)
    with open(artifact_paths["trust_model_dispute"], "wb") as f:
        pickle.dump(models["dispute"], f)
    with open(artifact_paths["anomaly_model"], "wb") as f:
        pickle.dump(anomaly_model, f)
    with open(artifact_paths["trust_feature_names"], "wb") as f:
        pickle.dump(TRUST_FEATURE_NAMES, f)

    print("\n[TrustTrainer] Artifacts saved:")
    for name, path in artifact_paths.items():
        size_kb = os.path.getsize(path) / 1024
        print(f"  {name}: {path} ({size_kb:.1f} KB)")

    print("\n[TrustTrainer] Trust model training complete.")


if __name__ == "__main__":
    train_trust_models()
