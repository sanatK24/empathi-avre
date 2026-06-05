import os, logging, joblib, numpy as np, pandas as pd, lightgbm as lgb
from typing import List, Dict, Any, Tuple, TYPE_CHECKING
if TYPE_CHECKING:
    from models import Campaign
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sklearn.preprocessing import StandardScaler
from config import settings
from core.location import LocationUtils
logger = logging.getLogger(__name__)
class CampaignRankerService:
    MODEL_PATH = "artifacts/campaign_ranker_model.pkl"
    SCALER_PATH = "artifacts/campaign_ranker_scaler.pkl"
    def __init__(self):
        self.model, self.scaler = self._load_model(), self._load_scaler()
        logger.info("CampaignRankerService initialized")
    def rank_campaigns(self, db: Session, campaigns: List['Campaign'], user_id: int = None, context: Dict[str, Any] = None) -> List[Tuple['Campaign', float]]:
        if not campaigns: return []
        logger.info(f"Ranking {len(campaigns)} campaigns for user {user_id}")
        try:
            features_df = self._prepare_campaign_features(db, campaigns, user_id, context)
            scores = self._predict_scores(features_df) if (self.model and self.scaler) else self._fallback_ranking(db, campaigns)
            return sorted(zip(campaigns, scores), key=lambda x: x[1], reverse=True)
        except Exception as e:
            logger.error(f"Error ranking campaigns: {str(e)}")
            return [(c, 0.5) for c in campaigns]
    def _prepare_campaign_features(self, db: Session, campaigns: List['Campaign'], user_id: int = None, context: Dict[str, Any] = None) -> pd.DataFrame:
        return pd.DataFrame([self._get_single_features(db, c, context) for c in campaigns])
    def _get_single_features(self, db: Session, c: 'Campaign', context: Dict[str, Any] = None) -> Dict[str, Any]:
        try:
            return {
                'goal_amount': c.goal_amount or 1000, 'raised_percentage': self._get_raised_percentage(c),
                'days_active': (datetime.now() - c.created_at).days, 'urgency_level': self._encode_urgency(c.urgency_level),
                'donor_count': len(c.donations), 'avg_donation': self._compute_avg_donation(c),
                'recent_donations_7d': self._count_recent_donations(c, days=7), 'momentum': self._compute_momentum(c),
                'is_verified': 1 if c.verified else 0, 'creator_trust_score': self._get_creator_trust_score(db, c.created_by),
                'toxicity_score': getattr(c, 'toxicity_score', 0.0) or 0.0, 'category_confidence': getattr(c, 'category_confidence', 0.5) or 0.5,
                'spam_risk_score': getattr(c, 'spam_risk_score', 0.0) or 0.0, 'category_match': self._compute_category_match(c, context),
                'geographic_relevance': self._compute_geographic_relevance(c, context), 'created_recently': 1 if (datetime.now() - c.created_at).days < 7 else 0
            }
        except Exception as e:
            logger.warning(f"Error extracting features for campaign {getattr(c, 'id', 'unknown')}: {e}")
            return {
                'goal_amount': 1000, 'raised_percentage': 0.5, 'days_active': 0, 'urgency_level': 0.5,
                'donor_count': 0, 'avg_donation': 0, 'recent_donations_7d': 0, 'momentum': 0,
                'is_verified': 0, 'creator_trust_score': 0.5, 'toxicity_score': 0.0, 'category_confidence': 0.5,
                'spam_risk_score': 0.0, 'category_match': 0.5, 'geographic_relevance': 0.5, 'created_recently': 0
            }
    def _get_raised_percentage(self, c: 'Campaign') -> float:
        return 0.0 if not c.goal_amount or c.goal_amount <= 0 else min(100, (c.raised_amount / c.goal_amount) * 100)
    def _encode_urgency(self, level: str) -> float:
        return {'LOW': 0.25, 'MEDIUM': 0.5, 'HIGH': 0.75, 'CRITICAL': 1.0}.get(level, 0.5)
    def _compute_avg_donation(self, c: 'Campaign') -> float:
        if not c.donations: return 0.0
        from models import DonationStatus
        comp = [d.amount for d in c.donations if d.status == DonationStatus.COMPLETED]
        return sum(comp) / len(comp) if comp else 0.0
    def _count_recent_donations(self, c: 'Campaign', days: int = 7) -> int:
        from models import DonationStatus
        cutoff = datetime.now() - timedelta(days=days)
        return sum(1 for d in c.donations if d.status == DonationStatus.COMPLETED and d.created_at >= cutoff)
    def _compute_momentum(self, c: 'Campaign') -> float:
        from models import DonationStatus
        comp = [d for d in c.donations if d.status == DonationStatus.COMPLETED]
        if len(comp) < 2: return 0.0
        recent = self._count_recent_donations(c, 7)
        older = len(comp) - recent
        return 1.0 if older == 0 else min(1.0, recent / older)
    def _get_creator_trust_score(self, db: Session, creator_id: int) -> float:
        try:
            from models import CampaignCreatorTrust
            p = db.query(CampaignCreatorTrust).filter(CampaignCreatorTrust.user_id == creator_id).first()
            return p.composite_trust_score if p else 0.5
        except: return 0.5
    def _compute_category_match(self, c: 'Campaign', ctx: Dict = None) -> float:
        return 0.5 if not ctx or not ctx.get('preferred_category') else (1.0 if c.category_id == ctx['preferred_category'] else 0.3)
    def _compute_geographic_relevance(self, c: 'Campaign', ctx: Dict = None) -> float:
        if not ctx: return 0.5
        if c.lat is not None and c.lng is not None and ctx.get('user_lat') is not None and ctx.get('user_lng') is not None:
            dist = LocationUtils.haversine_distance(c.lat, c.lng, ctx['user_lat'], ctx['user_lng'])
            if dist <= settings.ULTRA_PROXIMITY_THRESHOLD_KM: return 1.0
            if dist <= settings.PROXIMITY_THRESHOLD_KM: return 0.8
            if dist <= settings.MAX_MATCH_DISTANCE_KM: return 0.6
            return 0.3
        return 0.5 if not ctx.get('user_city') else (0.8 if c.city == ctx['user_city'] else 0.3)
    def _predict_scores(self, df: pd.DataFrame) -> np.ndarray:
        try:
            raw = self.model.predict(self.scaler.transform(df))
            mn, mx = raw.min(), raw.max()
            return np.ones_like(raw) * 0.5 if mx == mn else np.clip((raw - mn) / (mx - mn), 0, 1)
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            return np.ones(len(df)) * 0.5
    def _fallback_ranking(self, db: Session, campaigns: List['Campaign']) -> np.ndarray:
        from models import DonationStatus
        return np.array([min(1.0, 0.5 + self._compute_momentum(c) * 0.3 + (0.2 if c.verified else 0)) for c in campaigns])
    def train_model(self, db: Session, test_size: float = 0.2, num_boost_rounds: int = 100) -> bool:
        logger.info("Starting model training...")
        X, y = self._prepare_training_data(db)
        if len(X) < 10:
            logger.warning("Not enough training data (need ≥10 completed campaigns)")
            return False
        try:
            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X)
            from sklearn.model_selection import train_test_split
            X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=test_size, random_state=42)
            train_data = lgb.Dataset(X_train, label=y_train)
            test_data = lgb.Dataset(X_test, label=y_test, reference=train_data)
            params = {'objective': 'binary', 'metric': 'binary_logloss', 'num_leaves': 31, 'learning_rate': 0.05, 'verbose': -1}
            self.model = lgb.train(params, train_data, num_boost_round=num_boost_rounds, valid_sets=[test_data], early_stopping_rounds=10)
            os.makedirs('artifacts', exist_ok=True)
            joblib.dump(self.model, self.MODEL_PATH)
            joblib.dump(self.scaler, self.SCALER_PATH)
            logger.info(f"✓ Model trained on {len(X)} campaigns and saved to {self.MODEL_PATH}")
            return True
        except Exception as e:
            logger.error(f"Training failed: {e}")
            return False
    def _prepare_training_data(self, db: Session) -> Tuple[pd.DataFrame, np.ndarray]:
        from models import Campaign, CampaignStatus
        completed = db.query(Campaign).filter(Campaign.status == CampaignStatus.COMPLETED).all()
        X_list, y_list = [], []
        for c in completed:
            try:
                X_list.append(self._prepare_campaign_features(db, [c]).iloc[0].values)
                y_list.append(1 if ((c.raised_amount / c.goal_amount) if c.goal_amount > 0 else 0) >= 0.8 else 0)
            except: pass
        return (pd.DataFrame(X_list), np.array(y_list)) if X_list else (pd.DataFrame(), np.array([]))
    def get_feature_importance(self) -> Dict[str, float]:
        if not self.model: return {}
        names = ['goal_amount', 'raised_percentage', 'days_active', 'urgency_level', 'donor_count', 'avg_donation', 'recent_donations_7d', 'momentum', 'is_verified', 'creator_trust_score', 'category_match', 'geographic_relevance', 'created_recently']
        try: return dict(zip(names, self.model.feature_importance()))
        except: return {}
    def _load_model(self):
        if os.path.exists(self.MODEL_PATH):
            try: return joblib.load(self.MODEL_PATH)
            except Exception as e: logger.warning(f"Could not load model: {e}")
        return None
    def _load_scaler(self):
        if os.path.exists(self.SCALER_PATH):
            try: return joblib.load(self.SCALER_PATH)
            except Exception as e: logger.warning(f"Could not load scaler: {e}")
        return None
campaign_ranker_service = CampaignRankerService()
