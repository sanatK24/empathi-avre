"""
TrustService: Online Trust Score Computation (Phase 2)

Provides per-vendor trust scoring used as Stage 4 of the ranking pipeline.
Trust scores are:
  - Cached in VendorTrustProfile (updated lazily after transaction events)
  - Decomposed into 5 explainable component signals
  - Backed by XGBoost models when available, heuristic fallback otherwise
  - Used for Stage 1 hard-filtering (fraud) and Stage 5 ranking multiplier

Trust score components:
  fulfillment_probability  — P(vendor fulfills the order on time)
  cancellation_risk        — P(vendor cancels)
  dispute_probability      — P(dispute raised by requester)
  delivery_reliability     — P(on-time delivery)
  anomaly_score            — Isolation Forest anomaly signal [0.0–1.0]
  composite_trust_score    — Combined multiplier for ranking
"""

import os
import pickle
import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc

from models import (
    Vendor, Match, MatchStatus, VerificationStatus,
    VendorTrustProfile, Transaction, TransactionStatus
)
from config import BASE_DIR


# Path to ML artifacts (same directory as Phase 1 ranker)
ARTIFACTS_DIR = os.path.join(os.path.dirname(BASE_DIR), "ml_artifacts")

# Cache max age — skip recompute if profile was updated within this window
CACHE_MAX_AGE_HOURS = 1.0

# Isolation Forest anomaly score thresholds
ANOMALY_FLAG_THRESHOLD   = 0.75   # Hard fraud flag
ANOMALY_WARN_THRESHOLD   = 0.50   # Penalize but don't exclude


@dataclass
class TrustScore:
    vendor_id: int
    fulfillment_probability: float  = 0.85
    cancellation_risk: float        = 0.10
    dispute_probability: float      = 0.05
    refund_likelihood: float        = 0.05
    delivery_reliability: float     = 0.80
    anomaly_score: float            = 0.0
    composite_trust_score: float    = 0.80
    is_fraud_flagged: bool          = False
    is_heuristic: bool              = True   # True when no ML model loaded


class TrustService:
    # Lazily loaded models (singleton per process)
    _fulfillment_model = None
    _cancellation_model = None
    _dispute_model = None
    _anomaly_model = None
    _trust_feature_names: Optional[List[str]] = None
    _models_loaded: bool = False

    # -----------------------------------------------------------------------
    # Model loading
    # -----------------------------------------------------------------------
    @classmethod
    def _load_models(cls) -> None:
        if cls._models_loaded:
            return

        paths = {
            "fulfillment":   os.path.join(ARTIFACTS_DIR, "trust_model_fulfillment.pkl"),
            "cancellation":  os.path.join(ARTIFACTS_DIR, "trust_model_cancellation.pkl"),
            "dispute":       os.path.join(ARTIFACTS_DIR, "trust_model_dispute.pkl"),
            "anomaly":       os.path.join(ARTIFACTS_DIR, "anomaly_model.pkl"),
            "feature_names": os.path.join(ARTIFACTS_DIR, "trust_feature_names.pkl"),
        }

        try:
            if all(os.path.exists(p) for p in paths.values()):
                with open(paths["fulfillment"], "rb") as f:
                    cls._fulfillment_model = pickle.load(f)
                with open(paths["cancellation"], "rb") as f:
                    cls._cancellation_model = pickle.load(f)
                with open(paths["dispute"], "rb") as f:
                    cls._dispute_model = pickle.load(f)
                with open(paths["anomaly"], "rb") as f:
                    cls._anomaly_model = pickle.load(f)
                with open(paths["feature_names"], "rb") as f:
                    cls._trust_feature_names = pickle.load(f)
                print("[TrustService] Loaded XGBoost + IsolationForest trust models.")
            else:
                print("[TrustService] Trust model artifacts not found — using heuristic fallback.")
        except Exception as e:
            print(f"[TrustService] Failed loading trust models: {e} — using heuristic fallback.")

        cls._models_loaded = True

    @classmethod
    def is_ml_loaded(cls) -> bool:
        cls._load_models()
        return all([
            cls._fulfillment_model,
            cls._cancellation_model,
            cls._dispute_model,
            cls._anomaly_model,
        ])

    # -----------------------------------------------------------------------
    # Stage 1: Fraud hard-filter check
    # -----------------------------------------------------------------------
    @staticmethod
    def is_fraud_flagged(db: Session, vendor: Vendor) -> bool:
        """
        Returns True if this vendor should be hard-excluded from the pipeline.
        Checks VendorTrustProfile cache. If no profile exists, returns False (safe default).
        """
        profile = db.query(VendorTrustProfile).filter(
            VendorTrustProfile.vendor_id == vendor.id
        ).first()
        if profile and profile.is_fraud_flagged:
            return True

        # Deterministic hard rules (model-independent)
        if vendor.verification_status == VerificationStatus.REJECTED:
            return True

        return False

    # -----------------------------------------------------------------------
    # Feature extraction (vendor-level, 11 features)
    # -----------------------------------------------------------------------
    @staticmethod
    def _build_trust_features(db: Session, vendor: Vendor) -> Dict[str, float]:
        """
        Builds the 11 vendor-level trust features from DB history.
        These are distinct from FeatureStore's per-request-pair features.
        """
        all_matches = db.query(Match).filter(Match.vendor_id == vendor.id).all()
        total = len(all_matches)

        completed = sum(1 for m in all_matches if m.status == MatchStatus.COMPLETED)
        rejected  = sum(1 for m in all_matches if m.status == MatchStatus.REJECTED_BY_VENDOR)
        accepted  = sum(1 for m in all_matches if m.status in {
            MatchStatus.ACCEPTED_BY_REQUESTER, MatchStatus.ACCEPTED_BY_VENDOR, MatchStatus.COMPLETED
        })

        completion_rate = completed / total if total > 0 else 0.5
        rejection_rate  = rejected / total  if total > 0 else 0.05
        selection_rate  = (
            (vendor.total_selections or 0) / max(1, vendor.total_impressions or 1)
        )

        avg_match_score = (
            db.query(sqlfunc.avg(Match.score))
            .filter(Match.vendor_id == vendor.id)
            .scalar() or 0.0
        )

        is_verified = 1.0 if vendor.verification_status == VerificationStatus.VERIFIED else 0.0
        days_active = max(0.0, (datetime.now() - vendor.created_at).days) if vendor.created_at else 0.0

        return {
            "completed_orders":   float(vendor.total_completed_orders or 0),
            "selection_rate":     float(min(1.0, selection_rate)),
            "avg_match_score":    float(min(100.0, avg_match_score)),
            "rejection_rate":     float(min(1.0, rejection_rate)),
            "completion_rate":    float(min(1.0, completion_rate)),
            "verified":           float(is_verified),
            "avg_response_time":  float(vendor.avg_response_time or 15),
            "reliability_score":  float(vendor.reliability_score or 0.8),
            "rating":             float(vendor.rating or 3.5),
            "days_active":        float(days_active),
            "fairness_penalty":   float(vendor.fairness_penalty or 0.0),
        }

    # -----------------------------------------------------------------------
    # Heuristic fallback scoring (no ML model required)
    # -----------------------------------------------------------------------
    @staticmethod
    def compute_heuristic_trust(db: Session, vendor_id: int) -> TrustScore:
        """
        Deterministic heuristic trust score when XGBoost models are not loaded.
        Uses reliability_score, verification_status, and match history.
        """
        vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
        if not vendor:
            return TrustScore(vendor_id=vendor_id)

        feats = TrustService._build_trust_features(db, vendor)

        rel = feats["reliability_score"]          # 0.0–1.0
        is_v = feats["verified"]                  # 0 or 1
        comp = feats["completion_rate"]            # 0.0–1.0
        rej  = feats["rejection_rate"]             # 0.0–1.0

        fulfillment_probability = round(0.6 * rel + 0.4 * comp, 3)
        cancellation_risk       = round(max(0.0, min(1.0, 0.5 * rej + 0.5 * (1 - rel))), 3)
        dispute_probability     = round(max(0.0, 0.1 * (1 - rel) + 0.05 * (1 - comp)), 3)
        refund_likelihood       = dispute_probability  # Proxy
        delivery_reliability    = round(0.7 * rel + 0.3 * is_v, 3)
        anomaly_score           = round(max(0.0, min(1.0, rej * 0.8 + (1 - rel) * 0.2)), 3)

        composite = round(
            fulfillment_probability
            * (1.0 - cancellation_risk)
            * (1.0 - dispute_probability),
            3
        )
        composite = max(0.0, min(1.0, composite))

        is_fraud = (
            anomaly_score >= ANOMALY_FLAG_THRESHOLD
            or vendor.verification_status == VerificationStatus.REJECTED
            or (feats["rejection_rate"] > 0.8 and feats["completed_orders"] > 3)
        )

        return TrustScore(
            vendor_id=vendor_id,
            fulfillment_probability=fulfillment_probability,
            cancellation_risk=cancellation_risk,
            dispute_probability=dispute_probability,
            refund_likelihood=refund_likelihood,
            delivery_reliability=delivery_reliability,
            anomaly_score=anomaly_score,
            composite_trust_score=composite,
            is_fraud_flagged=is_fraud,
            is_heuristic=True,
        )

    # -----------------------------------------------------------------------
    # ML scoring
    # -----------------------------------------------------------------------
    @classmethod
    def _compute_ml_trust(cls, db: Session, vendor: Vendor, feats: Dict[str, float]) -> TrustScore:
        """
        Runs XGBoost + IsolationForest scoring using loaded models.
        """
        import numpy as np

        feat_vec = [[feats.get(f, 0.0) for f in cls._trust_feature_names]]

        fulfillment_probability = float(cls._fulfillment_model.predict_proba(feat_vec)[0][1])
        cancellation_risk       = float(cls._cancellation_model.predict_proba(feat_vec)[0][1])
        dispute_probability     = float(cls._dispute_model.predict_proba(feat_vec)[0][1])

        # IsolationForest: decision_function returns negative for anomalies
        # Normalize to [0, 1] where 1 = most anomalous
        raw_anomaly = cls._anomaly_model.decision_function(feat_vec)[0]
        anomaly_score = float(max(0.0, min(1.0, 0.5 - raw_anomaly)))

        refund_likelihood    = round((cancellation_risk + dispute_probability) / 2.0, 3)
        delivery_reliability = round(fulfillment_probability * (1.0 - cancellation_risk), 3)

        composite = round(
            fulfillment_probability
            * (1.0 - cancellation_risk)
            * (1.0 - dispute_probability),
            3
        )
        composite = max(0.0, min(1.0, composite))

        is_fraud = (
            anomaly_score >= ANOMALY_FLAG_THRESHOLD
            or vendor.verification_status == VerificationStatus.REJECTED
            or (feats["rejection_rate"] > 0.8 and feats["completed_orders"] > 3)
        )

        return TrustScore(
            vendor_id=vendor.id,
            fulfillment_probability=round(fulfillment_probability, 3),
            cancellation_risk=round(cancellation_risk, 3),
            dispute_probability=round(dispute_probability, 3),
            refund_likelihood=round(refund_likelihood, 3),
            delivery_reliability=round(delivery_reliability, 3),
            anomaly_score=round(anomaly_score, 3),
            composite_trust_score=composite,
            is_fraud_flagged=is_fraud,
            is_heuristic=False,
        )

    # -----------------------------------------------------------------------
    # Main scoring entry point (single vendor, cached)
    # -----------------------------------------------------------------------
    @classmethod
    def score_vendor(cls, db: Session, vendor: Vendor) -> TrustScore:
        """
        Returns a TrustScore for a single vendor.
        Uses VendorTrustProfile cache if fresh (< CACHE_MAX_AGE_HOURS old).
        Recomputes and upserts otherwise.
        """
        cls._load_models()

        # Check cache freshness
        profile = db.query(VendorTrustProfile).filter(
            VendorTrustProfile.vendor_id == vendor.id
        ).first()

        if profile and profile.last_computed_at:
            age_hours = (datetime.now() - profile.last_computed_at).total_seconds() / 3600.0
            if age_hours < CACHE_MAX_AGE_HOURS:
                # Return cached score
                return TrustScore(
                    vendor_id=vendor.id,
                    fulfillment_probability=profile.fulfillment_probability,
                    cancellation_risk=profile.cancellation_risk,
                    dispute_probability=profile.dispute_probability,
                    refund_likelihood=profile.refund_likelihood,
                    delivery_reliability=profile.delivery_reliability,
                    anomaly_score=profile.anomaly_score,
                    composite_trust_score=profile.composite_trust_score,
                    is_fraud_flagged=profile.is_fraud_flagged,
                    is_heuristic=profile.is_heuristic,
                )

        # Compute fresh score
        try:
            if cls.is_ml_loaded():
                feats = cls._build_trust_features(db, vendor)
                trust = cls._compute_ml_trust(db, vendor, feats)
            else:
                trust = cls.compute_heuristic_trust(db, vendor.id)
        except Exception as e:
            print(f"[TrustService] Scoring failed for vendor {vendor.id}: {e} — using heuristic.")
            trust = cls.compute_heuristic_trust(db, vendor.id)

        # Upsert VendorTrustProfile cache
        cls._upsert_profile(db, trust)

        return trust

    # -----------------------------------------------------------------------
    # Batch scoring for all candidates (Stage 4 pipeline call)
    # -----------------------------------------------------------------------
    @classmethod
    def score_candidates(
        cls,
        db: Session,
        candidates: List[Dict[str, Any]]
    ) -> Dict[int, TrustScore]:
        """
        Scores all candidates in a match pipeline call.
        Returns dict keyed by vendor_id.
        Called from EmpathIEngine.match() as Stage 4.
        """
        trust_map: Dict[int, TrustScore] = {}
        for c in candidates:
            vendor = c["vendor"]
            try:
                trust_map[vendor.id] = cls.score_vendor(db, vendor)
            except Exception as e:
                print(f"[TrustService] Failed scoring vendor {vendor.id}: {e}")
                # Safe default — neutral trust, no fraud flag
                trust_map[vendor.id] = TrustScore(vendor_id=vendor.id)
        return trust_map

    # -----------------------------------------------------------------------
    # Cache upsert
    # -----------------------------------------------------------------------
    @staticmethod
    def _upsert_profile(db: Session, trust: TrustScore) -> None:
        profile = db.query(VendorTrustProfile).filter(
            VendorTrustProfile.vendor_id == trust.vendor_id
        ).first()

        if not profile:
            profile = VendorTrustProfile(vendor_id=trust.vendor_id)
            db.add(profile)

        profile.fulfillment_probability = trust.fulfillment_probability
        profile.cancellation_risk       = trust.cancellation_risk
        profile.dispute_probability     = trust.dispute_probability
        profile.refund_likelihood       = trust.refund_likelihood
        profile.delivery_reliability    = trust.delivery_reliability
        profile.anomaly_score           = trust.anomaly_score
        profile.composite_trust_score   = trust.composite_trust_score
        profile.is_fraud_flagged        = trust.is_fraud_flagged
        profile.is_heuristic            = trust.is_heuristic
        profile.last_computed_at        = datetime.now()

        try:
            db.commit()
        except Exception:
            db.rollback()
