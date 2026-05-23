"""
Unified Campaign Ranker Service

Consolidates:
- ml_pipeline.py
- ml_modeling.py
- ml_data_pipeline.py
- features.py
- predict.py
- train.py
- lgbm_service.py
- datasets.py

Purpose: Single entry point for campaign discovery ranking via LightGBM
"""

from typing import List, Dict, Any, Tuple, TYPE_CHECKING
if TYPE_CHECKING:
    from models import Campaign
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
import lightgbm as lgb
from sklearn.preprocessing import StandardScaler
import joblib
import os
import logging

logger = logging.getLogger(__name__)


class CampaignRankerService:
    """
    Unified LightGBM-based campaign ranking service.

    Entry point: rank_campaigns(db, campaigns, user_id, context)
    Returns: [(campaign, score), ...] sorted by score descending
    """

    MODEL_PATH = "artifacts/campaign_ranker_model.pkl"
    SCALER_PATH = "artifacts/campaign_ranker_scaler.pkl"

    def __init__(self):
        self.model = self._load_model()
        self.scaler = self._load_scaler()
        logger.info("CampaignRankerService initialized")

    # ============ MAIN API ============

    def rank_campaigns(
        self,
        db: Session,
        campaigns: List['Campaign'],
        user_id: int = None,
        context: Dict[str, Any] = None
    ) -> List[Tuple['Campaign', float]]:
        """
        Main entry point: rank campaigns for discovery feed.

        Args:
            db: Database session
            campaigns: List of campaigns to rank
            user_id: Optional user ID for personalization
            context: Optional context dict with user_city, preferences, etc.

        Returns:
            Sorted list of (campaign, score) tuples, highest score first
        """
        if not campaigns:
            return []

        logger.info(f"Ranking {len(campaigns)} campaigns for user {user_id}")

        try:
            # Prepare features
            features_df = self._prepare_campaign_features(db, campaigns, user_id, context)

            # Get scores (or default if model not available)
            if self.model and self.scaler:
                scores = self._predict_scores(features_df)
            else:
                logger.warning("Model not loaded, using fallback ranking")
                scores = self._fallback_ranking(db, campaigns)

            # Zip campaigns with scores
            ranked = list(zip(campaigns, scores))
            ranked.sort(key=lambda x: x[1], reverse=True)

            return ranked

        except Exception as e:
            logger.error(f"Error ranking campaigns: {str(e)}")
            # Fallback: return in creation order
            return [(c, 0.5) for c in campaigns]

    # ============ FEATURE ENGINEERING ============

    def _prepare_campaign_features(
        self,
        db: Session,
        campaigns: List['Campaign'],
        user_id: int = None,
        context: Dict[str, Any] = None
    ) -> pd.DataFrame:
        """
        Extract and engineer features for LightGBM ranking.

        Features:
        - Goal amount and progress
        - Donation metrics (count, average, momentum)
        - Campaign age and recency
        - Urgency level
        - Creator trust score
        - Geographic relevance
        - Verification status
        """
        features_list = []

        for campaign in campaigns:
            try:
                features = {
                    # Goal & progress
                    'goal_amount': campaign.goal_amount or 1000,
                    'raised_percentage': self._get_raised_percentage(campaign),
                    'days_active': (datetime.now() - campaign.created_at).days,

                    # Urgency (encoded)
                    'urgency_level': self._encode_urgency(campaign.urgency_level),

                    # Donor engagement
                    'donor_count': len(campaign.donations),
                    'avg_donation': self._compute_avg_donation(campaign),
                    'recent_donations_7d': self._count_recent_donations(campaign, days=7),
                    'momentum': self._compute_momentum(campaign),

                    # Verification & trust
                    'is_verified': 1 if campaign.verified else 0,
                    'creator_trust_score': self._get_creator_trust_score(db, campaign.created_by),

                    # AI Metadata Features
                    'toxicity_score': getattr(campaign, 'toxicity_score', 0.0) or 0.0,
                    'category_confidence': getattr(campaign, 'category_confidence', 0.5) or 0.5,
                    'spam_risk_score': getattr(campaign, 'spam_risk_score', 0.0) or 0.0,

                    # Personalization
                    'category_match': self._compute_category_match(campaign, context),
                    'geographic_relevance': self._compute_geographic_relevance(campaign, context),

                    # Temporal
                    'created_recently': 1 if (datetime.now() - campaign.created_at).days < 7 else 0,
                }
                features_list.append(features)

            except Exception as e:
                logger.warning(f"Error extracting features for campaign {campaign.id}: {e}")
                # Use neutral features
                features_list.append({
                    'goal_amount': 1000,
                    'raised_percentage': 0.5,
                    'days_active': 0,
                    'urgency_level': 0.5,
                    'donor_count': 0,
                    'avg_donation': 0,
                    'recent_donations_7d': 0,
                    'momentum': 0,
                    'is_verified': 0,
                    'creator_trust_score': 0.5,
                    'toxicity_score': 0.0,
                    'category_confidence': 0.5,
                    'spam_risk_score': 0.0,
                    'category_match': 0.5,
                    'geographic_relevance': 0.5,
                    'created_recently': 0,
                })

        return pd.DataFrame(features_list)

    def _get_raised_percentage(self, campaign: 'Campaign') -> float:
        """Percentage of goal raised."""
        if not campaign.goal_amount or campaign.goal_amount <= 0:
            return 0.0
        return min(100, (campaign.raised_amount / campaign.goal_amount) * 100)

    def _encode_urgency(self, urgency_level: str) -> float:
        """Convert urgency enum to numeric [0, 1]."""
        mapping = {
            'LOW': 0.25,
            'MEDIUM': 0.5,
            'HIGH': 0.75,
            'CRITICAL': 1.0
        }
        return mapping.get(urgency_level, 0.5)

    def _compute_avg_donation(self, campaign: 'Campaign') -> float:
        """Average donation amount per donor."""
        if not campaign.donations:
            return 0.0
        from models import DonationStatus
        completed = [d for d in campaign.donations if d.status == DonationStatus.COMPLETED]
        if not completed:
            return 0.0
        return sum(d.amount for d in completed) / len(completed)

    def _count_recent_donations(self, campaign: 'Campaign', days: int = 7) -> int:
        """Count completed donations in last N days."""
        from models import DonationStatus
        cutoff = datetime.now() - timedelta(days=days)
        return len([
            d for d in campaign.donations
            if d.status == DonationStatus.COMPLETED and d.created_at >= cutoff
        ])

    def _compute_momentum(self, campaign: 'Campaign') -> float:
        """
        Momentum: recent donation rate compared to all donations.
        High momentum = trending campaign.
        """
        from models import DonationStatus
        completed = [
            d for d in campaign.donations
            if d.status == DonationStatus.COMPLETED
        ]

        if len(completed) < 2:
            return 0.0

        recent = self._count_recent_donations(campaign, days=7)
        older = len(completed) - recent

        if older == 0:
            return 1.0
        return min(1.0, recent / older)

    def _get_creator_trust_score(self, db: Session, creator_id: int) -> float:
        """Get creator's composite trust score (0-1)."""
        try:
            from models import CampaignCreatorTrust
            trust_profile = db.query(CampaignCreatorTrust).filter(
                CampaignCreatorTrust.creator_id == creator_id
            ).first()
            return trust_profile.composite_trust_score if trust_profile else 0.5
        except:
            return 0.5

    def _compute_category_match(self, campaign: 'Campaign', context: Dict = None) -> float:
        """Does campaign match user's preferred category?"""
        if not context or not context.get('preferred_category'):
            return 0.5
        return 1.0 if campaign.category_id == context['preferred_category'] else 0.3

    def _compute_geographic_relevance(self, campaign: 'Campaign', context: Dict = None) -> float:
        """Is campaign in user's city?"""
        if not context or not context.get('user_city'):
            return 0.5
        return 1.0 if campaign.city == context['user_city'] else 0.3

    # ============ INFERENCE ============

    def _predict_scores(self, features_df: pd.DataFrame) -> np.ndarray:
        """LightGBM inference: convert features to ranking scores."""
        try:
            features_scaled = self.scaler.transform(features_df)
            raw_scores = self.model.predict(features_scaled)
            # Normalize to [0, 1]
            min_score, max_score = raw_scores.min(), raw_scores.max()
            if max_score == min_score:
                return np.ones_like(raw_scores) * 0.5
            normalized = (raw_scores - min_score) / (max_score - min_score)
            return np.clip(normalized, 0, 1)
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            return np.ones(len(features_df)) * 0.5

    def _fallback_ranking(self, db: Session, campaigns: List['Campaign']) -> np.ndarray:
        """Fallback ranking when model unavailable: by momentum + verification."""
        from models import DonationStatus

        scores = []
        for campaign in campaigns:
            momentum = self._compute_momentum(campaign)
            verification_boost = 0.2 if campaign.verified else 0
            base_score = 0.5 + momentum * 0.3 + verification_boost
            scores.append(min(1.0, base_score))

        return np.array(scores)

    # ============ TRAINING ============

    def train_model(
        self,
        db: Session,
        test_size: float = 0.2,
        num_boost_rounds: int = 100
    ):
        """
        Train/retrain LightGBM ranker from historical campaign data.

        Training signal: campaigns that reached 80%+ of goal = success (1)
        """
        logger.info("Starting model training...")

        X, y = self._prepare_training_data(db)

        if X.shape[0] < 10:
            logger.warning("Not enough training data (need ≥10 completed campaigns)")
            return False

        try:
            # Scale features
            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X)

            # Split data
            from sklearn.model_selection import train_test_split
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y, test_size=test_size, random_state=42
            )

            # Create LightGBM datasets
            train_data = lgb.Dataset(X_train, label=y_train)
            test_data = lgb.Dataset(X_test, label=y_test, reference=train_data)

            # Train
            params = {
                'objective': 'binary',
                'metric': 'binary_logloss',
                'num_leaves': 31,
                'learning_rate': 0.05,
                'verbose': -1
            }

            self.model = lgb.train(
                params,
                train_data,
                num_boost_round=num_boost_rounds,
                valid_sets=[test_data],
                early_stopping_rounds=10
            )

            # Save model
            os.makedirs('artifacts', exist_ok=True)
            joblib.dump(self.model, self.MODEL_PATH)
            joblib.dump(self.scaler, self.SCALER_PATH)

            logger.info(f"✓ Model trained on {len(X)} campaigns and saved to {self.MODEL_PATH}")
            return True

        except Exception as e:
            logger.error(f"Training failed: {e}")
            return False

    def _prepare_training_data(self, db: Session) -> Tuple[pd.DataFrame, np.ndarray]:
        """
        Prepare training data from historical completed campaigns.

        Label: 1 if campaign raised ≥80% of goal, 0 otherwise
        """
        from models import Campaign, CampaignStatus

        # Get completed campaigns
        completed_campaigns = db.query(Campaign).filter(
            Campaign.status == CampaignStatus.COMPLETED
        ).all()

        X_list, y_list = [], []

        for campaign in completed_campaigns:
            try:
                features = self._prepare_campaign_features(db, [campaign])
                X_list.append(features.iloc[0].values)

                # Label: success if raised ≥80% of goal
                success_rate = (campaign.raised_amount / campaign.goal_amount) if campaign.goal_amount > 0 else 0
                label = 1 if success_rate >= 0.8 else 0
                y_list.append(label)
            except:
                pass

        if not X_list:
            return pd.DataFrame(), np.array([])

        X = pd.DataFrame(X_list)
        y = np.array(y_list)

        return X, y

    def get_feature_importance(self) -> Dict[str, float]:
        """Return LightGBM feature importance scores."""
        if not self.model:
            return {}

        feature_names = [
            'goal_amount', 'raised_percentage', 'days_active', 'urgency_level',
            'donor_count', 'avg_donation', 'recent_donations_7d', 'momentum',
            'is_verified', 'creator_trust_score', 'category_match',
            'geographic_relevance', 'created_recently'
        ]

        try:
            importance = self.model.feature_importance()
            return dict(zip(feature_names, importance))
        except:
            return {}

    # ============ UTILITIES ============

    def _load_model(self):
        """Load pre-trained LightGBM model if available."""
        if os.path.exists(self.MODEL_PATH):
            try:
                return joblib.load(self.MODEL_PATH)
            except Exception as e:
                logger.warning(f"Could not load model: {e}")
                return None
        return None

    def _load_scaler(self):
        """Load pre-trained feature scaler if available."""
        if os.path.exists(self.SCALER_PATH):
            try:
                return joblib.load(self.SCALER_PATH)
            except Exception as e:
                logger.warning(f"Could not load scaler: {e}")
                return None
        return None


# Global instance
campaign_ranker_service = CampaignRankerService()
