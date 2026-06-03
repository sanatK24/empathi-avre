from typing import List, Dict, Tuple, Optional, TYPE_CHECKING
if TYPE_CHECKING:
    from models import Campaign
from datetime import datetime
from sqlalchemy.orm import Session
import logging
logger = logging.getLogger(__name__)
class FairnessEngine:
    def __init__(self, fairness_weight: float = 0.2):
        self.fairness_weight, self.impression_log = fairness_weight, {}
        logger.info(f"FairnessEngine initialized with weight={fairness_weight}")
    def apply_fairness_reranking(self, db: Session, ranked_campaigns: List[Tuple], user_id: int = None) -> List[Tuple]:
        if not ranked_campaigns: return []
        logger.debug(f"Applying fairness reranking to {len(ranked_campaigns)} campaigns")
        res = []
        for c, s in ranked_campaigns:
            self.track_impression(c.id, user_id)
            res.append((c, s * (1 - self.fairness_weight) + (1 - self._compute_fairness_penalty(db, c)) * self.fairness_weight))
        res.sort(key=lambda x: x[1], reverse=True)
        logger.debug(f"Fairness reranking complete: top 3 adjusted scores: {[score for _, score in res[:3]]}")
        return res
    def _compute_fairness_penalty(self, db: Session, campaign: 'Campaign') -> float:
        from models import Donation, DonationStatus
        imp = self.impression_log.get(campaign.id, 0)
        if not imp: return 0.0
        donations = db.query(Donation).filter(Donation.campaign_id == campaign.id, Donation.status == DonationStatus.COMPLETED).count()
        return min(max(0, 1 - donations / max(imp * 0.05, 1)), 0.5)
    def apply_diversity_constraint(self, ranked_campaigns: List[Tuple], max_same_category: int = 3, max_same_creator: int = 2) -> List[Tuple]:
        cat_cnt, cre_cnt, filtered = {}, {}, []
        logger.debug(f"Applying diversity constraints: max {max_same_category}/category, {max_same_creator}/creator")
        for camp, score in ranked_campaigns:
            cat, cre = camp.category_id, camp.created_by
            if cat_cnt.get(cat, 0) < max_same_category and cre_cnt.get(cre, 0) < max_same_creator:
                filtered.append((camp, score))
                cat_cnt[cat] = cat_cnt.get(cat, 0) + 1
                cre_cnt[cre] = cre_cnt.get(cre, 0) + 1
        logger.debug(f"Diversity filtering: {len(ranked_campaigns)} → {len(filtered)} campaigns")
        return filtered
    def track_impression(self, campaign_id: int, user_id: int = None):
        self.impression_log[campaign_id] = self.impression_log.get(campaign_id, 0) + 1
        logger.debug(f"Impression tracked: campaign {campaign_id}, total={self.impression_log[campaign_id]}")
    def get_impression_stats(self, db: Session) -> Dict[str, any]:
        if not self.impression_log:
            return {'top_10_concentration': 0.5, 'fairness_score': 0.5, 'unique_campaigns_shown': 0, 'total_impressions': 0}
        top_impressions = sum(count for _, count in sorted(self.impression_log.items(), key=lambda x: x[1], reverse=True)[:10])
        total_impressions = sum(self.impression_log.values())
        top_concentration = top_impressions / total_impressions if total_impressions > 0 else 0.5
        return {'top_10_concentration': top_concentration, 'fairness_score': max(0.0, 1.0 - (top_concentration / 10.0)), 'unique_campaigns_shown': len(self.impression_log), 'total_impressions': total_impressions, 'audit_timestamp': datetime.now().isoformat()}
    def reset_impression_log(self):
        logger.info(f"Impression log reset. Tracked {len(self.impression_log)} campaigns")
        self.impression_log = {}
fairness_engine_service = FairnessEngine(fairness_weight=0.2)
