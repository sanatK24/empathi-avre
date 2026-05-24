"""
Unified Trust Engine Service

Consolidates:
- trust_service.py
- trust_train.py
- trust_datasets.py

Purpose: Single authority for campaign creator trust scoring (fraud detection + fulfillment probability)
"""

from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import numpy as np
import xgboost as xgb
import joblib
import os
import logging

logger = logging.getLogger(__name__)


class TrustEngine:
    """
    Unified trust scoring for campaign creators.

    Computes:
    - Fulfillment probability (likelihood creator will deliver)
    - Fraud risk score (0-1, probability of fraud)
    - Dispute probability (likelihood of donor disputes)
    - Composite trust score (weighted average)
    """

    MODEL_PATH = "artifacts/trust_fraud_model.pkl"

    def __init__(self):
        self.fraud_model = self._load_model()
        logger.info("TrustEngine initialized")

    # ============ MAIN API ============

    def compute_creator_trust(
        self,
        db: Session,
        creator_id: int
    ) -> Optional[Dict[str, float]]:
        """
        Compute complete trust profile for a campaign creator.

        Returns dict with:
        - fulfillment_probability: 0-1
        - fraud_risk_score: 0-1
        - dispute_probability: 0-1
        - composite_trust_score: 0-1 (weighted average)
        - is_fraud_flagged: bool (True if fraud_risk > 0.7)
        """
        try:
            from models import User, CampaignCreatorTrust

            creator = db.query(User).filter(User.id == creator_id).first()
            if not creator:
                logger.warning(f"Creator {creator_id} not found")
                return None

            # Compute individual scores
            fulfillment_prob = self._compute_fulfillment_probability(db, creator_id)
            fraud_risk = self._compute_fraud_risk(db, creator_id)
            dispute_risk = self._compute_dispute_probability(db, creator_id)

            # Composite score (weighted)
            composite = (
                fulfillment_prob * 0.5 +
                (1 - fraud_risk) * 0.3 +
                (1 - dispute_risk) * 0.2
            )

            # Get or create trust profile
            trust_profile = db.query(CampaignCreatorTrust).filter(
                CampaignCreatorTrust.user_id == creator_id
            ).first()

            if not trust_profile:
                trust_profile = CampaignCreatorTrust(user_id=creator_id)
                db.add(trust_profile)

            # Update profile
            trust_profile.fulfillment_probability = fulfillment_prob
            trust_profile.fraud_risk_score = fraud_risk
            trust_profile.dispute_probability = dispute_risk
            trust_profile.composite_trust_score = composite
            trust_profile.is_fraud_flagged = fraud_risk > 0.7
            trust_profile.updated_at = datetime.now()

            db.commit()
            db.refresh(trust_profile)

            logger.info(f"✓ Trust computed for creator {creator_id}: {composite:.2f}")

            return {
                'creator_id': creator_id,
                'fulfillment_probability': fulfillment_prob,
                'fraud_risk_score': fraud_risk,
                'dispute_probability': dispute_risk,
                'composite_trust_score': composite,
                'is_fraud_flagged': fraud_risk > 0.7,
                'created_at': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error computing trust for creator {creator_id}: {e}")
            return None

    # ============ SCORE COMPUTATIONS ============

    def _compute_fulfillment_probability(self, db: Session, creator_id: int) -> float:
        """
        Fulfillment probability: likelihood that creator will deliver on campaigns.

        Based on:
        - Campaign completion rate
        - Post-completion update frequency
        - Account age
        """
        from models import Campaign, CampaignStatus, User

        try:
            creator = db.query(User).filter(User.id == creator_id).first()
            if not creator:
                return 0.5

            # Account age factor
            account_age_days = (datetime.now() - creator.created_at).days
            age_factor = min(1.0, account_age_days / 365)  # 1 year = max score

            # Campaign history
            creator_campaigns = db.query(Campaign).filter(
                Campaign.created_by == creator_id
            ).all()

            if not creator_campaigns:
                # New creator: medium trust
                return 0.5 * (0.5 * age_factor + 0.5)

            # Completion rate
            completed = len([c for c in creator_campaigns if c.status == CampaignStatus.COMPLETED])
            completion_rate = completed / len(creator_campaigns)

            # Update frequency in recent campaigns
            recent_campaigns = [
                c for c in creator_campaigns
                if (datetime.now() - c.created_at).days < 30
            ]
            if recent_campaigns:
                total_updates = sum(len(c.updates) for c in recent_campaigns)
                update_frequency = min(1.0, total_updates / len(recent_campaigns) / 5)
            else:
                update_frequency = 0.5

            # Combined score
            fulfillment = (
                completion_rate * 0.6 +
                update_frequency * 0.3 +
                age_factor * 0.1
            )

            return min(1.0, fulfillment)

        except Exception as e:
            logger.warning(f"Error computing fulfillment probability: {e}")
            return 0.5

    def _compute_fraud_risk(self, db: Session, creator_id: int) -> float:
        """
        Fraud risk: probability of creator being fraudulent.

        Uses XGBoost model on anomalous behavior patterns:
        - Rapid campaign creation
        - Impossible goal amounts
        - Geographic anomalies
        - Donation pattern anomalies
        """
        from models import User, Campaign

        try:
            creator = db.query(User).filter(User.id == creator_id).first()
            if not creator:
                return 0.5

            # Extract fraud features
            features = self._extract_fraud_features(db, creator_id)

            # Use pre-trained model if available
            if self.fraud_model and features is not None:
                fraud_prob = self.fraud_model.predict([features])[0]
                logger.debug(f"Fraud model score for creator {creator_id}: {fraud_prob:.3f}")
                return fraud_prob

            # Fallback: heuristic scoring
            return self._heuristic_fraud_score(db, creator_id)

        except Exception as e:
            logger.warning(f"Error computing fraud risk: {e}")
            return 0.3  # Default: low-medium risk

    def _extract_fraud_features(self, db: Session, creator_id: int) -> Optional[np.ndarray]:
        """
        Extract feature vector for XGBoost fraud model.

        Features:
        - Number of campaigns
        - Profile age (days)
        - Average goal amount
        - Goal variance (high variance = suspicious)
        - Average fundraising success rate
        - Rapid campaign creation rate
        - Category concentration (all same = suspicious)
        """
        from models import Campaign, User
        import statistics

        try:
            creator = db.query(User).filter(User.id == creator_id).first()
            campaigns = db.query(Campaign).filter(
                Campaign.created_by == creator_id
            ).all()

            if not campaigns:
                return None

            goal_amounts = [c.goal_amount for c in campaigns if c.goal_amount > 0]
            success_rates = [
                (c.raised_amount / c.goal_amount) if c.goal_amount > 0 else 0
                for c in campaigns
            ]
            categories = [c.category_id for c in campaigns]

            features = {
                'num_campaigns': len(campaigns),
                'profile_age_days': (datetime.now() - creator.created_at).days,
                'avg_goal_amount': np.mean(goal_amounts) if goal_amounts else 1000,
                'goal_amount_variance': np.var(goal_amounts) if len(goal_amounts) > 1 else 0,
                'avg_success_rate': np.mean(success_rates) if success_rates else 0,
                'recent_campaign_velocity': self._compute_campaign_velocity(campaigns),
                'category_concentration': 1.0 if len(set(categories)) == 1 else 0.5,
                'email_domain_suspicious': 1.0 if self._is_suspicious_email(creator.email) else 0,
            }

            return np.array([features[k] for k in sorted(features.keys())])

        except Exception as e:
            logger.warning(f"Error extracting fraud features: {e}")
            return None

    def _heuristic_fraud_score(self, db: Session, creator_id: int) -> float:
        """Heuristic fraud scoring when model unavailable."""
        from models import Campaign, User

        try:
            creator = db.query(User).filter(User.id == creator_id).first()
            campaigns = db.query(Campaign).filter(
                Campaign.created_by == creator_id
            ).all()

            score = 0.2  # Base: low fraud risk

            # Red flags
            if len(campaigns) > 10:
                score += 0.1  # Many campaigns
            if (datetime.now() - creator.created_at).days < 7:
                score += 0.15  # Very new account
            if campaigns and np.var([c.goal_amount for c in campaigns]) > 1e6:
                score += 0.1  # High variance in goals

            # AI Red Flags
            toxic_campaigns = [c for c in campaigns if getattr(c, 'toxicity_score', 0.0) and c.toxicity_score > 0.7]
            if toxic_campaigns:
                score += 0.4  # Major red flag for toxic/abusive content

            spam_campaigns = [c for c in campaigns if getattr(c, 'spam_risk_score', 0.0) and c.spam_risk_score > 0.5]
            if spam_campaigns:
                score += 0.3  # Major red flag for spam

            # OCR / Document Placeholder
            # In future: Check if creator's verification documents match campaign metadata (LayoutLM + TrOCR)
            # if creator.has_ocr_mismatches:
            #     score += 0.2

            return min(1.0, score)

        except:
            return 0.3

    def _compute_dispute_probability(self, db: Session, creator_id: int) -> float:
        """
        Dispute probability: likelihood of donor disputes/complaints.

        For now, simple heuristic (would use historical dispute data in production).
        """
        from models import User

        try:
            creator = db.query(User).filter(User.id == creator_id).first()

            # New creators: higher dispute risk (unknown quantity)
            account_age_days = (datetime.now() - creator.created_at).days
            if account_age_days < 30:
                return 0.4
            if account_age_days < 90:
                return 0.25
            return 0.1

        except:
            return 0.15

    # ============ UTILITIES ============

    def _compute_campaign_velocity(self, campaigns: list) -> float:
        """
        Campaign creation velocity: how fast are campaigns created?

        High velocity (many campaigns in short time) = suspicious
        """
        if len(campaigns) < 2:
            return 0.0

        creation_times = sorted([c.created_at for c in campaigns])
        days_span = (creation_times[-1] - creation_times[0]).days
        if days_span == 0:
            return 1.0  # All created on same day = very suspicious

        velocity = len(campaigns) / max(days_span, 1)
        # 1 campaign per day = 1.0, normalize
        return min(1.0, velocity)

    def _is_suspicious_email(self, email: str) -> bool:
        """Check if email domain is suspicious (temporary, disposable, etc.)."""
        suspicious_domains = [
            'tempmail', 'throwaway', '10minutemail', 'guerrillamail',
            'mailinator', 'yopmail', 'temp-mail'
        ]
        domain = email.split('@')[1].lower() if '@' in email else ''
        return any(suspicious in domain for suspicious in suspicious_domains)

    def _load_model(self):
        """Load pre-trained XGBoost fraud model if available."""
        if os.path.exists(self.MODEL_PATH):
            try:
                return joblib.load(self.MODEL_PATH)
            except Exception as e:
                logger.warning(f"Could not load fraud model: {e}")
                return None
        return None

    def train_fraud_model(self, db: Session, positive_examples: list = None):
        """
        Train XGBoost fraud detection model.

        Args:
            db: Database session
            positive_examples: List of creator IDs known to be fraudulent (optional)
        """
        logger.info("Starting fraud model training...")

        try:
            X, y = self._prepare_fraud_training_data(db, positive_examples)

            if X.shape[0] < 10:
                logger.warning("Not enough training data for fraud model (need ≥10 examples)")
                return False

            # Train XGBoost
            self.fraud_model = xgb.XGBClassifier(
                objective='binary:logistic',
                max_depth=5,
                learning_rate=0.1,
                n_estimators=100,
                random_state=42
            )

            self.fraud_model.fit(X, y)

            # Save
            os.makedirs('artifacts', exist_ok=True)
            joblib.dump(self.fraud_model, self.MODEL_PATH)

            logger.info(f"✓ Fraud model trained on {len(X)} examples and saved to {self.MODEL_PATH}")
            return True

        except Exception as e:
            logger.error(f"Fraud model training failed: {e}")
            return False

    def _prepare_fraud_training_data(
        self,
        db: Session,
        positive_examples: list = None
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare training data for fraud model."""
        from models import User

        try:
            creators = db.query(User).filter(User.role == 'CREATOR').limit(200).all()

            X, y = [], []

            for creator in creators:
                features = self._extract_fraud_features(db, creator.id)
                if features is not None:
                    X.append(features)
                    # Label: 1 if in positive_examples, 0 otherwise
                    label = 1 if (positive_examples and creator.id in positive_examples) else 0
                    y.append(label)

            if not X:
                return np.array([]), np.array([])

            return np.array(X), np.array(y)

        except Exception as e:
            logger.error(f"Error preparing fraud training data: {e}")
            return np.array([]), np.array([])


# Global instance
trust_engine_service = TrustEngine()
