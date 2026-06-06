import os, logging, joblib, numpy as np, xgboost as xgb
from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
logger = logging.getLogger(__name__)
class TrustEngine:
    MODEL_PATH = 'artifacts/trust_fraud_model.pkl'
    def __init__(self):
        self.fraud_model = self._load_model()
        logger.info('TrustEngine initialized')
    def compute_creator_trust(self, db: Session, creator_id: int) -> Optional[Dict[str, float]]:
        try:
            from models import User, CampaignCreatorTrust
            creator = db.query(User).filter(User.id == creator_id).first()
            if not creator:
                logger.warning(f'Creator {creator_id} not found')
                return None
            fulfillment_prob = self._compute_fulfillment_probability(db, creator_id)
            fraud_risk = self._compute_fraud_risk(db, creator_id)
            dispute_risk = self._compute_dispute_probability(db, creator_id)
            composite = fulfillment_prob * 0.5 + (1 - fraud_risk) * 0.3 + (1 - dispute_risk) * 0.2
            trust_profile = db.query(CampaignCreatorTrust).filter(CampaignCreatorTrust.user_id == creator_id).first()
            if not trust_profile:
                trust_profile = CampaignCreatorTrust(user_id=creator_id)
                db.add(trust_profile)
            trust_profile.fulfillment_probability = fulfillment_prob
            trust_profile.fraud_risk_score = fraud_risk
            trust_profile.dispute_probability = dispute_risk
            trust_profile.composite_trust_score = composite
            trust_profile.is_fraud_flagged = fraud_risk > 0.7
            trust_profile.updated_at = datetime.now()
            db.commit()
            db.refresh(trust_profile)
            logger.info(f'✓ Trust computed for creator {creator_id}: {composite:.2f}')
            return {'creator_id': creator_id, 'fulfillment_probability': fulfillment_prob, 'fraud_risk_score': fraud_risk, 'dispute_probability': dispute_risk, 'composite_trust_score': composite, 'is_fraud_flagged': fraud_risk > 0.7, 'created_at': datetime.now().isoformat()}
        except Exception as e:
            logger.error(f'Error computing trust for creator {creator_id}: {e}')
            return None
    def _compute_fulfillment_probability(self, db: Session, creator_id: int) -> float:
        from models import Campaign, CampaignStatus, User
        try:
            creator = db.query(User).filter(User.id == creator_id).first()
            if not creator:
                return 0.5
            account_age_days = (datetime.now() - creator.created_at).days
            age_factor = min(1.0, account_age_days / 365)
            creator_campaigns = db.query(Campaign).filter(Campaign.created_by == creator_id).all()
            if not creator_campaigns:
                return 0.5 * (0.5 * age_factor + 0.5)
            completed = len([c for c in creator_campaigns if c.status == CampaignStatus.COMPLETED])
            completion_rate = completed / len(creator_campaigns)
            recent_campaigns = [c for c in creator_campaigns if (datetime.now() - c.created_at).days < 30]
            update_frequency = min(1.0, sum((len(c.updates) for c in recent_campaigns)) / len(recent_campaigns) / 5) if recent_campaigns else 0.5
            return min(1.0, completion_rate * 0.6 + update_frequency * 0.3 + age_factor * 0.1)
        except Exception as e:
            logger.warning(f'Error computing fulfillment probability: {e}')
            return 0.5
    def _compute_fraud_risk(self, db: Session, creator_id: int) -> float:
        from models import User, Campaign
        try:
            creator = db.query(User).filter(User.id == creator_id).first()
            if not creator:
                return 0.5
            features = self._extract_fraud_features(db, creator_id)
            if self.fraud_model and features is not None:
                fraud_prob = self.fraud_model.predict([features])[0]
                logger.debug(f'Fraud model score for creator {creator_id}: {fraud_prob:.3f}')
                return fraud_prob
            return self._heuristic_fraud_score(db, creator_id)
        except Exception as e:
            logger.warning(f'Error computing fraud risk: {e}')
            return 0.3
    def _extract_fraud_features(self, db: Session, creator_id: int) -> Optional[np.ndarray]:
        from models import Campaign, User
        try:
            creator = db.query(User).filter(User.id == creator_id).first()
            campaigns = db.query(Campaign).filter(Campaign.created_by == creator_id).all()
            if not campaigns:
                return None
            goal_amounts = [c.goal_amount for c in campaigns if c.goal_amount > 0]
            success_rates = [c.raised_amount / c.goal_amount if c.goal_amount > 0 else 0 for c in campaigns]
            categories = [c.category_id for c in campaigns]
            features = {'num_campaigns': len(campaigns), 'profile_age_days': (datetime.now() - creator.created_at).days, 'avg_goal_amount': np.mean(goal_amounts) if goal_amounts else 1000, 'goal_amount_variance': np.var(goal_amounts) if len(goal_amounts) > 1 else 0, 'avg_success_rate': np.mean(success_rates) if success_rates else 0, 'recent_campaign_velocity': self._compute_campaign_velocity(campaigns), 'category_concentration': 1.0 if len(set(categories)) == 1 else 0.5, 'email_domain_suspicious': 1.0 if self._is_suspicious_email(creator.email) else 0}
            return np.array([features[k] for k in sorted(features.keys())])
        except Exception as e:
            logger.warning(f'Error extracting fraud features: {e}')
            return None
    def _heuristic_fraud_score(self, db: Session, creator_id: int) -> float:
        from models import Campaign, User
        try:
            creator = db.query(User).filter(User.id == creator_id).first()
            campaigns = db.query(Campaign).filter(Campaign.created_by == creator_id).all()
            score = 0.2
            score += 0.1 if len(campaigns) > 10 else 0
            score += 0.15 if (datetime.now() - creator.created_at).days < 7 else 0
            score += 0.1 if campaigns and np.var([c.goal_amount for c in campaigns]) > 1000000.0 else 0
            score += 0.4 if any(((getattr(c, 'toxicity_score', 0.0) or 0.0) > 0.7 for c in campaigns)) else 0
            score += 0.3 if any(((getattr(c, 'spam_risk_score', 0.0) or 0.0) > 0.5 for c in campaigns)) else 0
            return min(1.0, score)
        except:
            return 0.3
    def _compute_dispute_probability(self, db: Session, creator_id: int) -> float:
        from models import User
        try:
            creator = db.query(User).filter(User.id == creator_id).first()
            days = (datetime.now() - creator.created_at).days
            return 0.4 if days < 30 else 0.25 if days < 90 else 0.1
        except:
            return 0.15
    def _compute_campaign_velocity(self, campaigns: list) -> float:
        if len(campaigns) < 2:
            return 0.0
        creation_times = sorted([c.created_at for c in campaigns])
        days_span = (creation_times[-1] - creation_times[0]).days
        if days_span == 0:
            return 1.0
        return min(1.0, len(campaigns) / max(days_span, 1))
    def _is_suspicious_email(self, email: str) -> bool:
        domain = email.split('@')[1].lower() if '@' in email else ''
        return any((s in domain for s in ['tempmail', 'throwaway', '10minutemail', 'guerrillamail', 'mailinator', 'yopmail', 'temp-mail']))
    def _load_model(self):
        if os.path.exists(self.MODEL_PATH):
            try:
                return joblib.load(self.MODEL_PATH)
            except Exception as e:
                logger.warning(f'Could not load fraud model: {e}')
        return None
    def train_fraud_model(self, db: Session, positive_examples: list=None):
        logger.info('Starting fraud model training...')
        try:
            (X, y) = self._prepare_fraud_training_data(db, positive_examples)
            if X.shape[0] < 10:
                logger.warning('Not enough training data for fraud model (need ≥10 examples)')
                return False
            self.fraud_model = xgb.XGBClassifier(objective='binary:logistic', max_depth=5, learning_rate=0.1, n_estimators=100, random_state=42)
            self.fraud_model.fit(X, y)
            os.makedirs('artifacts', exist_ok=True)
            joblib.dump(self.fraud_model, self.MODEL_PATH)
            logger.info(f'✓ Fraud model trained on {len(X)} examples and saved to {self.MODEL_PATH}')
            return True
        except Exception as e:
            logger.error(f'Fraud model training failed: {e}')
            return False
    def _prepare_fraud_training_data(self, db: Session, positive_examples: list=None) -> Tuple[np.ndarray, np.ndarray]:
        from models import User
        try:
            creators = db.query(User).filter(User.role == 'CREATOR').limit(200).all()
            (X, y) = ([], [])
            for creator in creators:
                features = self._extract_fraud_features(db, creator.id)
                if features is not None:
                    X.append(features)
                    y.append(1 if positive_examples and creator.id in positive_examples else 0)
            return (np.array(X), np.array(y)) if X else (np.array([]), np.array([]))
        except Exception as e:
            logger.error(f'Error preparing fraud training data: {e}')
            return (np.array([]), np.array([]))
trust_engine_service = TrustEngine()
