from typing import List, Dict, Any
from sqlalchemy.orm import Session
from models import User, Campaign, CampaignStatus, Donation
from repositories.campaign_repo import campaign_repo
from repositories.donation_repo import donation_repo
from services.ranking_service import RankingService
from core.exceptions import NotFoundException, ValidationException
import numpy as np

class CampaignService:
    @staticmethod
    def create_campaign(db: Session, user: User, data: Any) -> Campaign:
        campaign = Campaign(
            title=data.title,
            description=data.description,
            category=data.category,
            city=data.city,
            goal_amount=data.goal_amount,
            urgency_level=data.urgency_level,
            created_by=user.id,
            status=CampaignStatus.ACTIVE
        )
        db.add(campaign)
        db.commit()
        db.refresh(campaign)
        return campaign

    @staticmethod
    def get_recommendations(db: Session, user: User, limit: int = 6) -> List[Dict[str, Any]]:
        # Affinity extraction
        user_donations = donation_repo.get_user_donation_history(db, user.id)
        user_categories = set()
        if user_donations:
            donated_campaign_ids = [d.campaign_id for d in user_donations]
            donated_campaigns = db.query(Campaign).filter(Campaign.id.in_(donated_campaign_ids)).all()
            user_categories = {c.category for c in donated_campaigns}

        all_active = campaign_repo.get_active(db, limit=100)
        scored_recommendations = []

        for campaign in all_active:
            score = 0
            reasons = []

            # 1. Category Affinity (+30)
            if campaign.category in user_categories:
                score += 30
                reasons.append("Matches your interests")

            # 2. Location Proximity (+20)
            if user.city and campaign.city.lower() == user.city.lower():
                score += 20
                reasons.append("In your city")

            # 3. Verification Trust Bonus (+15)
            if campaign.verified:
                score += 15
                reasons.append("Verified campaign")

            # 4. Criticality/Urgency (+10)
            if campaign.urgency_level.value in ["high", "critical"]:
                score += 10
                reasons.append("High urgency")

        # 5. Use the Shared ML Ranking Engine for final ordering
        campaign_objects = [campaign for campaign in all_active]
        ranked_campaigns = RankingService.rank_campaigns(user, campaign_objects)
        
        # Build the final response list based on ML results
        final_recommendations = []
        for campaign in ranked_campaigns[:limit]:
            # Generate reasons (using the existing heuristic logic for explanations)
            reasons = []
            if campaign.category in user_categories: reasons.append("Interests")
            if user.city and campaign.city.lower() == user.city.lower(): reasons.append("Nearby")
            if campaign.verified: reasons.append("Verified")
            
            final_recommendations.append({
                "id": campaign.id,
                "title": campaign.title,
                "score": round(getattr(campaign, "matching_score", 0) * 100, 2),
                "reason": " • ".join(reasons) if reasons else "Recommended for you",
                "progress": round((campaign.raised_amount / campaign.goal_amount * 100) if campaign.goal_amount > 0 else 0, 1),
                "category": campaign.category,
                "city": campaign.city,
                "urgency_level": campaign.urgency_level
            })
            
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
            status="completed"
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
