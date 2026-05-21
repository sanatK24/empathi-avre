"""
trust_datasets.py — Builds vendor-level trust training dataset from Match history.

One row per vendor. Features derived from platform activity signals.
Labels derived from historical match outcomes.

Usage:
  from ml.trust_datasets import TrustDataset
  X, labels = TrustDataset().get_training_data()
"""

import os
import sys
import numpy as np
import pandas as pd
from sqlalchemy import create_engine, func as sqlfunc
from sqlalchemy.orm import sessionmaker
from typing import Tuple, Dict, List, Optional
from datetime import datetime

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
from models import Vendor, Match, MatchStatus, VerificationStatus, Transaction, TransactionStatus


TRUST_FEATURE_NAMES = [
    "completed_orders",
    "selection_rate",
    "avg_match_score",
    "rejection_rate",
    "completion_rate",
    "verified",
    "avg_response_time",
    "reliability_score",
    "rating",
    "days_active",
    "fairness_penalty",
]


class TrustDataset:
    def __init__(self, db_url: Optional[str] = None):
        if db_url is None:
            db_url = settings.DATABASE_URL
            if db_url.startswith("sqlite:///"):
                db_path = db_url.replace("sqlite:///", "")
                if not os.path.isabs(db_path):
                    possible = [
                        os.path.join(os.getcwd(), db_path),
                        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), db_path),
                        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), db_path),
                    ]
                    for p in possible:
                        if os.path.exists(p):
                            db_url = f"sqlite:///{os.path.abspath(p)}"
                            break
        self.engine = create_engine(db_url)
        self.Session = sessionmaker(bind=self.engine)

    def get_training_data(self) -> Tuple[pd.DataFrame, Dict[str, np.ndarray]]:
        """
        Builds vendor-level feature rows and multi-label targets.

        Returns:
            X   — DataFrame (n_vendors × 11 features)
            labels — dict with keys:
                       "fulfillment"  — 1 if vendor has high completion rate
                       "cancellation" — 1 if vendor has high rejection rate
                       "dispute"      — 1 if vendor has DISPUTED/FRAUD_FLAGGED transactions
        """
        session = self.Session()
        try:
            vendors = session.query(Vendor).all()
            if not vendors:
                return pd.DataFrame(columns=TRUST_FEATURE_NAMES), {}

            rows = []
            fulfillment_labels = []
            cancellation_labels = []
            dispute_labels = []

            for vendor in vendors:
                feats = self._vendor_features(session, vendor)
                rows.append(feats)

                # --- Label derivation ---
                # Fulfillment: 1 if completion_rate > 0.7 OR vendor very reliable
                fulfillment_labels.append(
                    1 if feats["completion_rate"] > 0.7 or feats["reliability_score"] > 0.85 else 0
                )

                # Cancellation: 1 if rejection_rate > 0.3
                cancellation_labels.append(
                    1 if feats["rejection_rate"] > 0.3 else 0
                )

                # Dispute: 1 if vendor has DISPUTED or FRAUD_FLAGGED transactions
                has_dispute = session.query(Transaction).filter(
                    Transaction.vendor_id == vendor.id,
                    Transaction.status.in_([
                        TransactionStatus.DISPUTED,
                        TransactionStatus.FRAUD_FLAGGED,
                        TransactionStatus.REFUNDED,
                    ])
                ).count() > 0
                dispute_labels.append(1 if has_dispute else 0)

            if not rows:
                return pd.DataFrame(columns=TRUST_FEATURE_NAMES), {}

            X = pd.DataFrame(rows, columns=TRUST_FEATURE_NAMES)
            labels = {
                "fulfillment":   np.array(fulfillment_labels),
                "cancellation":  np.array(cancellation_labels),
                "dispute":       np.array(dispute_labels),
            }
            return X, labels
        finally:
            session.close()

    def _vendor_features(self, session, vendor: Vendor) -> Dict[str, float]:
        """Extracts the 11 trust features for a single vendor."""
        all_matches = session.query(Match).filter(Match.vendor_id == vendor.id).all()
        total = len(all_matches)

        completed = sum(1 for m in all_matches if m.status == MatchStatus.COMPLETED)
        rejected  = sum(1 for m in all_matches if m.status == MatchStatus.REJECTED_BY_VENDOR)

        completion_rate = completed / total if total > 0 else 0.5
        rejection_rate  = rejected / total  if total > 0 else 0.05

        avg_score_row = session.query(sqlfunc.avg(Match.score)).filter(
            Match.vendor_id == vendor.id
        ).scalar()
        avg_match_score = float(avg_score_row or 0.0)

        total_impressions = vendor.total_impressions or 1
        total_selections  = vendor.total_selections or 0
        selection_rate    = min(1.0, total_selections / max(1, total_impressions))

        is_verified = 1.0 if vendor.verification_status == VerificationStatus.VERIFIED else 0.0
        days_active = float(
            max(0, (datetime.now() - vendor.created_at).days) if vendor.created_at else 0
        )

        return {
            "completed_orders":  float(vendor.total_completed_orders or 0),
            "selection_rate":    float(selection_rate),
            "avg_match_score":   float(min(100.0, avg_match_score)),
            "rejection_rate":    float(min(1.0, rejection_rate)),
            "completion_rate":   float(min(1.0, completion_rate)),
            "verified":          float(is_verified),
            "avg_response_time": float(vendor.avg_response_time or 15),
            "reliability_score": float(vendor.reliability_score or 0.8),
            "rating":            float(vendor.rating or 3.5),
            "days_active":       float(days_active),
            "fairness_penalty":  float(vendor.fairness_penalty or 0.0),
        }
