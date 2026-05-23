"""
Unified Fairness Engine Service

Consolidates:
- fairness_reranker.py
- fairness.py

Purpose: Fairness-aware campaign ranking (prevent top campaigns from monopolizing feed, ensure diversity)
"""

from typing import List, Dict, Tuple, Optional
from datetime import datetime
from sqlalchemy.orm import Session
import numpy as np
import logging

logger = logging.getLogger(__name__)


class FairnessEngine:
    """
    Fairness-aware ranking and reranking.

    Ensures:
    - No single campaign dominates all recommendations
    - Diverse campaigns get visibility
    - Fair allocation of impression share
    """

    def __init__(self, fairness_weight: float = 0.2):
        self.fairness_weight = fairness_weight  # 0-1: how much fairness vs base ranking
        self.impression_log = {}  # campaign_id → count
        logger.info(f"FairnessEngine initialized with weight={fairness_weight}")

    # ============ MAIN API ============

    def apply_fairness_reranking(
        self,
        db: Session,
        ranked_campaigns: List[Tuple],  # [(campaign, score), ...]
        user_id: int = None
    ) -> List[Tuple]:
        """
        Apply fairness constraints to already-ranked campaigns.

        Prevents top campaigns from monopolizing recommendations.
        Reranks based on fairness penalties.

        Returns: Reranked [(campaign, adjusted_score), ...] list
        """
        if not ranked_campaigns:
            return []

        logger.debug(f"Applying fairness reranking to {len(ranked_campaigns)} campaigns")

        adjusted_scores = []

        for campaign, base_score in ranked_campaigns:
            # Track impression
            self.track_impression(campaign.id, user_id)

            # Compute fairness penalty
            penalty = self._compute_fairness_penalty(db, campaign)

            # Adjusted score: blend base score with fairness
            adjusted_score = (
                base_score * (1 - self.fairness_weight) +
                (1 - penalty) * self.fairness_weight
            )

            adjusted_scores.append((campaign, adjusted_score))

        # Re-sort by adjusted score
        adjusted_scores.sort(key=lambda x: x[1], reverse=True)

        logger.debug(f"Fairness reranking complete: top 3 adjusted scores: "
                    f"{[score for _, score in adjusted_scores[:3]]}")

        return adjusted_scores

    def _compute_fairness_penalty(self, db: Session, campaign: 'Campaign') -> float:
        """
        Compute fairness penalty for a campaign.

        Higher penalty = lower rank (less visible)
        Based on: impressions received vs engagement generated

        Prevents: high-performing campaigns from appearing in every feed
        """
        from models import Donation, DonationStatus

        impressions = self.impression_log.get(campaign.id, 0)

        if impressions == 0:
            return 0.0  # No penalty if never shown

        # How many donations has this campaign actually received?
        donations = db.query(Donation).filter(
            Donation.campaign_id == campaign.id,
            Donation.status == DonationStatus.COMPLETED
        ).count()

        # Expected donations if campaign was truly proportionally popular
        # Heuristic: impressions should correlate with donations
        expected_donors = impressions * 0.05  # Assume 5% impression→donation rate

        # If showing far more than engagement warrants, penalize
        engagement_ratio = donations / max(expected_donors, 1)

        # Penalty: if low engagement despite many impressions, reduce visibility
        penalty = max(0, 1 - engagement_ratio)

        # Cap at 0.5: never fully demote a campaign (ensures all campaigns get visibility)
        return min(penalty, 0.5)

    def apply_diversity_constraint(
        self,
        ranked_campaigns: List[Tuple],
        max_same_category: int = 3,
        max_same_creator: int = 2
    ) -> List[Tuple]:
        """
        Diversity constraint: don't show too many campaigns from same category/creator.

        Ensures varied recommendations even if top campaigns are in same category.
        """
        category_count = {}
        creator_count = {}
        filtered = []

        logger.debug(f"Applying diversity constraints: max {max_same_category}/category, "
                    f"{max_same_creator}/creator")

        for campaign, score in ranked_campaigns:
            cat = campaign.category
            creator_id = campaign.creator_id

            cat_current = category_count.get(cat, 0)
            creator_current = creator_count.get(creator_id, 0)

            # Check constraints
            if cat_current < max_same_category and creator_current < max_same_creator:
                filtered.append((campaign, score))
                category_count[cat] = cat_current + 1
                creator_count[creator_id] = creator_current + 1

        logger.debug(f"Diversity filtering: {len(ranked_campaigns)} → {len(filtered)} campaigns")

        return filtered

    # ============ IMPRESSION TRACKING ============

    def track_impression(self, campaign_id: int, user_id: int = None):
        """Track that a campaign was shown to a user."""
        self.impression_log[campaign_id] = self.impression_log.get(campaign_id, 0) + 1
        logger.debug(f"Impression tracked: campaign {campaign_id}, total={self.impression_log[campaign_id]}")

    def get_impression_stats(self, db: Session) -> Dict[str, any]:
        """
        Get fairness audit metrics.

        Returns:
        - top_10_concentration: % of impressions going to top 10 campaigns
        - fairness_score: 0-1, higher = more fair (lower concentration)
        - unique_campaigns_shown: diversity metric
        - total_impressions: volume
        """
        from models import Campaign

        if not self.impression_log:
            return {
                'top_10_concentration': 0.5,
                'fairness_score': 0.5,
                'unique_campaigns_shown': 0,
                'total_impressions': 0
            }

        # Top 10 campaigns by impressions
        top_campaigns = sorted(
            self.impression_log.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]

        top_impressions = sum(count for _, count in top_campaigns)
        total_impressions = sum(self.impression_log.values())

        top_concentration = (
            top_impressions / total_impressions
            if total_impressions > 0 else 0.5
        )

        # Fairness score: 1.0 = perfect distribution, 0.1 = all in top 10
        # Perfect = 1/N per campaign, so concentration = 1/N
        # Concentration > 1/N = less fair
        unique_campaigns = len(self.impression_log)
        perfect_concentration = 1.0 / max(unique_campaigns, 1)
        fairness_score = max(0, 1 - (top_concentration / 10))  # 10 = top 10 campaigns

        return {
            'top_10_concentration': top_concentration,
            'fairness_score': fairness_score,
            'unique_campaigns_shown': unique_campaigns,
            'total_impressions': total_impressions,
            'audit_timestamp': datetime.now().isoformat()
        }

    def reset_impression_log(self):
        """Reset impression tracking (e.g., daily)."""
        count = len(self.impression_log)
        self.impression_log = {}
        logger.info(f"Impression log reset. Tracked {count} campaigns")


# Global instance with default fairness weight
fairness_engine_service = FairnessEngine(fairness_weight=0.2)
