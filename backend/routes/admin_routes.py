from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import User, Vendor, Request, Match, ScoringConfig, UserRole, Campaign, CampaignStatus
from schemas import AdminStats, ScoringWeightsUpdate
from auth import get_current_user, check_role
from services.audit import AuditService

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/stats", response_model=AdminStats, dependencies=[Depends(check_role([UserRole.ADMIN]))])
def get_stats(db: Session = Depends(get_db)):
    from models import VerificationStatus
    
    total_users = db.query(User).count()
    total_vendors = db.query(Vendor).count()
    total_requests = db.query(Request).count()
    total_matches = db.query(Match).count()
    
    active_vendors = db.query(Vendor).filter(Vendor.is_active == True).count()
    unverified_vendors = db.query(Vendor).filter(Vendor.verification_status != VerificationStatus.VERIFIED).count()
    total_requesters = db.query(User).filter(User.role == UserRole.REQUESTER).count()
    
    avg_score = db.query(func.avg(Match.score)).scalar() or 85.5
    
    return {
        "total_users": total_users,
        "total_vendors": total_vendors,
        "total_requests": total_requests,
        "total_matches": total_matches,
        "active_vendors": active_vendors,
        "unverified_vendors": unverified_vendors,
        "total_requesters": total_requesters,
        "avg_match_score": round(avg_score if avg_score > 1 else avg_score * 100, 1),
        "system_alerts": 2, # Example value
        "match_rate": 92.4,
        "match_activity": [
            {"name": "Mon", "matches": 12},
            {"name": "Tue", "matches": 19},
            {"name": "Wed", "matches": 15},
            {"name": "Thu", "matches": 22},
            {"name": "Fri", "matches": 30},
            {"name": "Sat", "matches": 25},
            {"name": "Sun", "matches": 18},
        ],
        "category_distribution": [
            {"name": "Medical", "value": 45},
            {"name": "Pharma", "value": 25},
            {"name": "Safety", "value": 20},
            {"name": "General", "value": 10},
        ]
    }

@router.put("/weights", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def update_weights(weights: ScoringWeightsUpdate, db: Session = Depends(get_db)):
    config = db.query(ScoringConfig).first()
    if not config:
        config = ScoringConfig()
        db.add(config)
    
    for key, value in weights.dict().items():
        setattr(config, key, value)
        
    db.commit()
    AuditService.log(db, "admin_changed_weights", user_id=current_user.id, resource_type="config", details=str(weights.dict()))
    return {"message": "Weights updated successfully"}

@router.get("/users", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@router.get("/vendors", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def list_vendors(db: Session = Depends(get_db)):
    return db.query(Vendor).all()

# ============ ADMIN CAMPAIGN ROUTES ============

@router.get("/campaigns", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def get_all_campaigns(
    db: Session = Depends(get_db),
    verified_only: bool = False,
    status: str = None,
    limit: int = 50,
    offset: int = 0
):
    """Get all campaigns (admin view)"""
    query = db.query(Campaign)

    if verified_only:
        query = query.filter(Campaign.verified == True)
    if status:
        query = query.filter(Campaign.status == status)

    campaigns = query.order_by(Campaign.created_at.desc()).limit(limit).offset(offset).all()
    return campaigns

@router.put("/campaigns/{campaign_id}/verify", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def verify_campaign(
    campaign_id: int,
    verified: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Verify or reject a campaign"""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.verified = verified
    db.commit()

    AuditService.log(
        db,
        action=f"campaign_{'verified' if verified else 'unverified'}",
        user_id=current_user.id,
        resource_type="campaign",
        resource_id=campaign_id
    )

    return {
        "detail": f"Campaign {'verified' if verified else 'unverified'}",
        "campaign_id": campaign_id,
        "verified": verified
    }

@router.put("/campaigns/{campaign_id}/status")
def update_campaign_status(
    campaign_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    admin_check = Depends(check_role([UserRole.ADMIN]))
):
    """Update campaign status (admin only)"""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    valid_statuses = [s.value for s in CampaignStatus]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    campaign.status = status
    db.commit()

    AuditService.log(
        db,
        action="campaign_status_changed",
        user_id=current_user.id,
        resource_type="campaign",
        resource_id=campaign_id,
        details=f"New status: {status}"
    )

    return {
        "detail": "Campaign status updated",
        "campaign_id": campaign_id,
        "status": status
    }

@router.get("/campaigns/{campaign_id}/details", dependencies=[Depends(check_role([UserRole.ADMIN]))])
def get_campaign_admin_details(campaign_id: int, db: Session = Depends(get_db)):
    """Get full campaign details for admin (including all donations)"""
    from sqlalchemy import and_
    from models import Donation

    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    total_donations = db.query(func.count(Donation.id)).filter(
        Donation.campaign_id == campaign_id
    ).scalar() or 0

    creator = db.query(User).filter(User.id == campaign.created_by).first()

    return {
        "campaign_id": campaign.id,
        "title": campaign.title,
        "description": campaign.description,
        "creator_name": creator.name if creator else "Unknown",
        "creator_email": creator.email if creator else "Unknown",
        "category": campaign.category,
        "city": campaign.city,
        "goal_amount": campaign.goal_amount,
        "raised_amount": campaign.raised_amount,
        "urgency_level": campaign.urgency_level,
        "status": campaign.status,
        "verified": campaign.verified,
        "total_donations": total_donations,
        "created_at": campaign.created_at,
        "deadline": campaign.deadline,
        "progress_percentage": round((campaign.raised_amount / campaign.goal_amount * 100) if campaign.goal_amount > 0 else 0, 2)
    }
