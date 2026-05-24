from typing import List, Dict, Any
from sqlalchemy.orm import Session
from models import User, Campaign, CampaignStatus, Donation, DonationStatus
from repositories.campaign_repo import campaign_repo
from repositories.donation_repo import donation_repo
from core.exceptions import NotFoundException, ValidationException
from ml.campaign_ranker import campaign_ranker_service
from services.trust_engine import trust_engine_service
from services.fairness_engine import fairness_engine_service
import numpy as np
import logging

logger = logging.getLogger(__name__)

from ml.hf_services import hf_services
import json

class CampaignService:
    @staticmethod
    def create_campaign(db: Session, user: User, data: Any) -> Campaign:
        # 1. Run HF AI Pipelines
        text_content = f"{data.title}. {data.description}"
        
        ai_summary = hf_services.summarize_campaign(text_content)

        # Prefer the comprehensive AI analyzer for category inference.
        # This avoids brittle zero-shot classifier failures on HF Router.
        analysis = hf_services.analyze_campaign_comprehensive(
            text_content,
            historical_campaigns=[],
            taxonomy_str=""
        )

        toxicity = hf_services.detect_toxicity(text_content)
        spam_risk = 0.0 # Placeholder or derived
        embeddings = hf_services.generate_embedding(text_content)

        predicted_category = analysis.get("predicted_category")
        # If predicted_category is missing, fall back to user-provided category.
        final_category = predicted_category if predicted_category else data.category

        from models import CampaignCategory
        cat_obj = db.query(CampaignCategory).filter(CampaignCategory.name.ilike(final_category)).first() if final_category else None
        category_id = cat_obj.id if cat_obj else data.category_id


        campaign = Campaign(
            title=data.title,
            description=data.description,
            category_id=category_id,
            subcategory_id=data.subcategory_id,
            city=data.city,
            goal_amount=data.goal_amount,
            urgency_level=data.urgency_level,
            cover_image=data.cover_image,
            deadline=data.deadline,
            created_by=user.id,
            status=CampaignStatus.ACTIVE,
            
            # Save AI Metadata
            ai_summary=ai_summary,
            category_tags=json.dumps(analysis.get("predicted_category", None) and [analysis.get("predicted_category")] or []),
            category_confidence=analysis.get("inferred_urgency") and 0.7 or 0.0,
            toxicity_score=toxicity,
            spam_risk_score=spam_risk,
            embedding_vector=json.dumps(embeddings)
        )
        db.add(campaign)
        db.commit()
        db.refresh(campaign)
        return campaign

    @staticmethod
    def get_recommendations(db: Session, user: User, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get personalized campaign recommendations.

        Pipeline:
        1. Get active campaigns
        2. Rank with LightGBM (campaign_ranker)
        3. Filter by trust (fraud detection)
        4. Apply fairness reranking
        5. Return top-N

        Returns: List of campaign recommendation dicts with scores and reasons
        """
        logger.info(f"Generating recommendations for user {user.id}")

        # Step 1: Get active campaigns
        all_active = campaign_repo.get_active(db, limit=200)  # Get more to filter
        if not all_active:
            logger.warning("No active campaigns found")
            return []

        # Step 2: Get user preferences for personalization
        user_donations = donation_repo.get_user_donation_history(db, user.id)
        user_categories = set()
        if user_donations:
            donated_campaign_ids = [d.campaign_id for d in user_donations]
            donated_campaigns = db.query(Campaign).filter(Campaign.id.in_(donated_campaign_ids)).all()
            user_categories = {c.category_id for c in donated_campaigns}

        context = {
            'user_city': user.city,
            'preferred_category': list(user_categories)[0] if user_categories else None,
        }

        # Step 3: Rank with LightGBM
        logger.debug(f"Ranking {len(all_active)} campaigns")
        ranked = campaign_ranker_service.rank_campaigns(db, all_active, user.id, context)

        # Step 4: Compute trust scores for creators (fraud detection)
        logger.debug("Computing trust scores for campaign creators")
        trusted_ranked = []
        for campaign, ml_score in ranked:
            try:
                # Get creator trust profile
                trust_profile = trust_engine_service.compute_creator_trust(db, campaign.created_by)
                if trust_profile and not trust_profile['is_fraud_flagged']:
                    trusted_ranked.append((campaign, ml_score, trust_profile['composite_trust_score']))
            except:
                # If trust computation fails, include campaign but with default score
                trusted_ranked.append((campaign, ml_score, 0.5))

        # Step 5: Apply fairness reranking
        logger.debug("Applying fairness reranking")
        ranked_tuples = [(c, s) for c, s, _ in trusted_ranked]
        fair_ranked = fairness_engine_service.apply_fairness_reranking(db, ranked_tuples, user.id)
        fair_ranked = fairness_engine_service.apply_diversity_constraint(fair_ranked)

        # Step 6: Build response
        final_recommendations = []
        for campaign, adjusted_score in fair_ranked[:limit]:
            # Get creator trust for display
            trust_score = 0.5
            try:
                creator_trust = trust_engine_service.compute_creator_trust(db, campaign.created_by)
                trust_score = creator_trust['composite_trust_score'] if creator_trust else 0.5
            except:
                pass

            # Build reasons
            reasons = []
            if campaign.category_id in user_categories:
                reasons.append("Matches your interests")
            if user.city and campaign.city and campaign.city.lower() == user.city.lower():
                reasons.append("In your city")
            if campaign.verified:
                reasons.append("Verified campaign")
            if campaign.urgency_level and campaign.urgency_level.value.lower() in ["high", "critical"]:
                reasons.append("High urgency")

            final_recommendations.append({
                "id": campaign.id,
                "title": campaign.title,
                "description": campaign.description,
                "cover_image": getattr(campaign, 'cover_image', None),
                "verified": bool(campaign.verified),
                "ml_score": round(adjusted_score * 100, 1),
                "trust_score": round(trust_score * 100, 1),
                "reason": " • ".join(reasons) if reasons else "Recommended for you",
                "progress": round((campaign.raised_amount / campaign.goal_amount * 100) if campaign.goal_amount > 0 else 0, 1),
                "category": campaign.taxonomy_category.name if campaign.taxonomy_category else "General Aid",
                "city": campaign.city,
                "urgency_level": campaign.urgency_level.value if campaign.urgency_level else None,
                "goal_amount": campaign.goal_amount,
                "raised_amount": campaign.raised_amount,
                "donor_count": len(campaign.donations),
            })

        logger.info(f"✓ Generated {len(final_recommendations)} recommendations for user {user.id}")
        return final_recommendations

    @staticmethod
    def add_donation(db: Session, user: User, campaign_id: int, amount: float, anonymous: bool = False) -> Donation:
        campaign = campaign_repo.get(db, campaign_id)
        if not campaign or campaign.status != CampaignStatus.ACTIVE:
            raise NotFoundException("Active Campaign")

        donation = Donation(
            campaign_id=campaign_id,
            user_id=user.id,
            amount=amount,
            anonymous=anonymous,
            status=DonationStatus.COMPLETED
        )
        db.add(donation)
        
        # Atomically update campaign total
        campaign.raised_amount += amount
        
        # Check if goal reached
        if campaign.raised_amount >= campaign.goal_amount:
            campaign.status = CampaignStatus.COMPLETED
            
        db.commit()
        db.refresh(donation)
        return donation
