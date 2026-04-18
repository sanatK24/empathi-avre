from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from database import get_db
from models import Campaign, Donation, User, CampaignStatus
from auth import get_current_user
import numpy as np
from datetime import datetime, timedelta

router = APIRouter(prefix="/campaigns/analytics", tags=["analytics"])

# ============ PERSONALIZED CAMPAIGN RECOMMENDATIONS ============
@router.get("/recommendations/personalized")
def get_personalized_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(6, ge=1, le=20)
):
    """
    Get personalized campaign recommendations based on:
    1. User's past donations (category affinity)
    2. User's location (nearby campaigns)
    3. Trending campaigns (high engagement)
    4. Similar urgency level to past donations
    """
    # Get user's donation history to find preferences
    user_donations = db.query(Donation).filter(Donation.user_id == current_user.id).all()
    user_categories = set()
    avg_urgency = None

    if user_donations:
        donated_campaigns = db.query(Campaign).filter(
            Campaign.id.in_([d.campaign_id for d in user_donations])
        ).all()
        user_categories = {c.category for c in donated_campaigns}
        urgencies = {'low': 0, 'medium': 1, 'high': 2, 'critical': 3}
        avg_urgency_score = np.mean([urgencies.get(c.urgency_level, 1) for c in donated_campaigns])
        # Map back to urgency level
        if avg_urgency_score >= 2.5:
            avg_urgency = 'critical'
        elif avg_urgency_score >= 1.5:
            avg_urgency = 'high'
        else:
            avg_urgency = 'medium'

    # Get trending campaigns (high donation activity in last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    trending_ids = db.query(Donation.campaign_id).filter(
        Donation.created_at >= seven_days_ago
    ).group_by(Donation.campaign_id).order_by(func.count(Donation.id).desc()).all()
    trending_ids = [t[0] for t in trending_ids]

    # Build recommendation query
    query = db.query(Campaign).filter(Campaign.status == CampaignStatus.ACTIVE)

    # Score campaigns
    recommendations = []
    all_campaigns = query.all()

    for campaign in all_campaigns:
        score = 0

        # Category match (+30 points)
        if campaign.category in user_categories:
            score += 30

        # Location match (+20 points)
        if current_user.city and campaign.city.lower() == current_user.city.lower():
            score += 20

        # Trending campaign (+25 points)
        if campaign.id in trending_ids:
            score += 25

        # Urgency match (+15 points)
        if avg_urgency and campaign.urgency_level == avg_urgency:
            score += 15

        # Verified bonus (+10 points)
        if campaign.verified:
            score += 10

        # Funding progress bonus (+5 points per 10% unfunded)
        progress = (campaign.raised_amount / campaign.goal_amount) if campaign.goal_amount > 0 else 0
        if progress < 1:
            score += int((1 - progress) * 5)

        recommendations.append({
            'campaign': campaign,
            'score': score,
            'reason': _get_recommendation_reason(campaign, user_categories, current_user.city, trending_ids)
        })

    # Sort by score and return top N
    recommendations.sort(key=lambda x: x['score'], reverse=True)

    return [
        {
            'id': r['campaign'].id,
            'title': r['campaign'].title,
            'description': r['campaign'].description,
            'category': r['campaign'].category,
            'city': r['campaign'].city,
            'goal_amount': r['campaign'].goal_amount,
            'raised_amount': r['campaign'].raised_amount,
            'urgency_level': r['campaign'].urgency_level,
            'verified': r['campaign'].verified,
            'score': r['score'],
            'reason': r['reason'],
            'progress': round((r['campaign'].raised_amount / r['campaign'].goal_amount * 100) if r['campaign'].goal_amount > 0 else 0, 1)
        }
        for r in recommendations[:limit]
    ]

def _get_recommendation_reason(campaign, user_categories, user_city, trending_ids):
    """Generate human-readable reason for recommendation"""
    reasons = []

    if campaign.category in user_categories:
        reasons.append(f"Similar to campaigns you've supported")
    if user_city and campaign.city.lower() == user_city.lower():
        reasons.append(f"In your city")
    if campaign.id in trending_ids:
        reasons.append("Trending now")
    if campaign.verified:
        reasons.append("Verified campaign")

    return " • ".join(reasons) if reasons else "Recommended for you"

# ============ CAMPAIGN ANALYTICS ============
@router.get("/dashboard")
def get_analytics_dashboard(db: Session = Depends(get_db)):
    """Get overall campaign analytics dashboard"""
    total_campaigns = db.query(Campaign).count()
    active_campaigns = db.query(Campaign).filter(Campaign.status == CampaignStatus.ACTIVE).count()
    completed_campaigns = db.query(Campaign).filter(Campaign.status == CampaignStatus.COMPLETED).count()

    total_donations = db.query(func.count(Donation.id)).scalar() or 0
    total_raised = db.query(func.sum(Donation.amount)).filter(
        Donation.status == 'completed'
    ).scalar() or 0.0

    unique_donors = db.query(func.count(Donation.user_id.distinct())).filter(
        Donation.status == 'completed'
    ).scalar() or 0

    avg_donation = (total_raised / total_donations) if total_donations > 0 else 0

    # Category breakdown
    category_stats = db.query(
        Campaign.category,
        func.count(Campaign.id).label('count'),
        func.sum(Donation.amount).label('raised')
    ).outerjoin(Donation, Campaign.id == Donation.campaign_id).group_by(
        Campaign.category
    ).all()

    # 7-day trend
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    daily_donations = db.query(
        func.date(Donation.created_at).label('date'),
        func.count(Donation.id).label('count'),
        func.sum(Donation.amount).label('amount')
    ).filter(
        Donation.created_at >= seven_days_ago,
        Donation.status == 'completed'
    ).group_by(func.date(Donation.created_at)).all()

    return {
        "summary": {
            "total_campaigns": total_campaigns,
            "active_campaigns": active_campaigns,
            "completed_campaigns": completed_campaigns,
            "total_donations": total_donations,
            "total_raised": round(total_raised, 2),
            "unique_donors": unique_donors,
            "average_donation": round(avg_donation, 2),
            "completion_rate": round((completed_campaigns / total_campaigns * 100) if total_campaigns > 0 else 0, 1)
        },
        "by_category": [
            {
                "category": cat,
                "campaigns": count,
                "total_raised": round(raised or 0, 2)
            }
            for cat, count, raised in category_stats
        ],
        "trend_7days": [
            {
                "date": str(date),
                "donations": count,
                "amount": round(amount or 0, 2)
            }
            for date, count, amount in daily_donations
        ]
    }

# ============ CAMPAIGN PERFORMANCE METRICS ============
@router.get("/{campaign_id}/performance")
def get_campaign_performance(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed performance metrics for a campaign"""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Calculate metrics
    total_donations = db.query(func.count(Donation.id)).filter(
        Donation.campaign_id == campaign_id,
        Donation.status == 'completed'
    ).scalar() or 0

    unique_donors = db.query(func.count(Donation.user_id.distinct())).filter(
        Donation.campaign_id == campaign_id,
        Donation.status == 'completed'
    ).scalar() or 0

    avg_donation = db.query(func.avg(Donation.amount)).filter(
        Donation.campaign_id == campaign_id,
        Donation.status == 'completed'
    ).scalar() or 0

    max_donation = db.query(func.max(Donation.amount)).filter(
        Donation.campaign_id == campaign_id,
        Donation.status == 'completed'
    ).scalar() or 0

    # Time to reach milestones
    time_created = campaign.created_at
    time_now = datetime.utcnow()
    days_active = (time_now - time_created).days

    # Donation velocity (donations per day)
    velocity = total_donations / days_active if days_active > 0 else 0

    # Estimated time to goal
    if velocity > 0:
        remaining = campaign.goal_amount - campaign.raised_amount
        days_to_goal = remaining / (velocity * avg_donation) if avg_donation > 0 else 0
        estimated_completion = time_now + timedelta(days=days_to_goal)
    else:
        days_to_goal = None
        estimated_completion = None

    # Top donors (anonymous hidden)
    top_donors = db.query(
        User.name,
        User.city,
        func.sum(Donation.amount).label('total_donated'),
        func.count(Donation.id).label('donation_count')
    ).join(Donation).filter(
        Donation.campaign_id == campaign_id,
        Donation.anonymous == False,
        Donation.status == 'completed'
    ).group_by(User.id).order_by(func.sum(Donation.amount).desc()).limit(5).all()

    return {
        "campaign_id": campaign_id,
        "campaign_title": campaign.title,
        "status": campaign.status,
        "metrics": {
            "goal_amount": campaign.goal_amount,
            "raised_amount": round(campaign.raised_amount, 2),
            "remaining_amount": round(max(0, campaign.goal_amount - campaign.raised_amount), 2),
            "progress_percentage": round((campaign.raised_amount / campaign.goal_amount * 100) if campaign.goal_amount > 0 else 0, 1),
            "total_donations": total_donations,
            "unique_donors": unique_donors,
            "average_donation": round(avg_donation, 2),
            "max_donation": round(max_donation, 2),
            "days_active": days_active,
            "donation_velocity": round(velocity, 2),
            "estimated_days_to_goal": round(days_to_goal, 1) if days_to_goal else None,
            "estimated_completion_date": estimated_completion.isoformat() if estimated_completion else None
        },
        "top_supporters": [
            {
                "name": donor[0],
                "city": donor[1],
                "total_donated": round(donor[2], 2),
                "donation_count": donor[3]
            }
            for donor in top_donors
        ]
    }

# ============ SIMILAR CAMPAIGNS ============
@router.get("/{campaign_id}/similar")
def get_similar_campaigns(
    campaign_id: int,
    db: Session = Depends(get_db),
    limit: int = Query(4, ge=1, le=20)
):
    """Get campaigns similar by category or location"""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    similar = db.query(Campaign).filter(
        Campaign.id != campaign_id,
        Campaign.status == CampaignStatus.ACTIVE,
        (Campaign.category == campaign.category) | (Campaign.city == campaign.city)
    ).order_by(Campaign.created_at.desc()).limit(limit).all()

    return [
        {
            "id": c.id,
            "title": c.title,
            "category": c.category,
            "city": c.city,
            "raised_amount": c.raised_amount,
            "goal_amount": c.goal_amount,
            "progress": round((c.raised_amount / c.goal_amount * 100) if c.goal_amount > 0 else 0, 1)
        }
        for c in similar
    ]
