from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from database import get_db
from models import Campaign, Donation, User, CampaignStatus, UrgencyLevel
from schemas import CampaignCreate, CampaignUpdate, CampaignResponse, CampaignDetailResponse, DonationResponse, DonationWithDonorResponse
from auth import get_current_user
from services.audit import AuditService
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

# ============ CREATE CAMPAIGN ============
@router.post("/", response_model=CampaignResponse, status_code=201)
def create_campaign(
    campaign_in: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new campaign"""
    new_campaign = Campaign(
        created_by=current_user.id,
        **campaign_in.dict()
    )
    db.add(new_campaign)
    db.commit()
    db.refresh(new_campaign)

    AuditService.log(
        db,
        action="campaign_created",
        user_id=current_user.id,
        resource_type="campaign",
        resource_id=new_campaign.id
    )
    return new_campaign

# ============ LIST CAMPAIGNS WITH FILTERS ============
@router.get("/", response_model=List[CampaignResponse])
def list_campaigns(
    db: Session = Depends(get_db),
    category: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    urgency: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="Filter by status: active, draft, completed, cancelled"),
    verified_only: bool = Query(False),
    sort_by: str = Query("created_at", description="Sort by: created_at, raised_amount, urgency_level"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """
    List campaigns with optional filters
    - category: Filter by category (medical, food, shelter, etc.)
    - city: Filter by city
    - urgency: Filter by urgency level
    - status: Filter by campaign status
    - verified_only: Only show verified campaigns
    - sort_by: Sort order
    """
    query = db.query(Campaign)

    # Apply filters
    if category:
        query = query.filter(Campaign.category.ilike(f"%{category}%"))
    if city:
        query = query.filter(Campaign.city.ilike(f"%{city}%"))
    if urgency:
        query = query.filter(Campaign.urgency_level == urgency)
    if status:
        query = query.filter(Campaign.status == status)
    if verified_only:
        query = query.filter(Campaign.verified == True)

    # Default to showing only active campaigns
    query = query.filter(Campaign.status == CampaignStatus.ACTIVE)

    # Sort
    if sort_by == "raised_amount":
        query = query.order_by(Campaign.raised_amount.desc())
    elif sort_by == "urgency_level":
        query = query.order_by(Campaign.urgency_level)
    else:
        query = query.order_by(Campaign.created_at.desc())

    campaigns = query.limit(limit).offset(offset).all()
    return campaigns

# ============ SEARCH CAMPAIGNS ============
@router.get("/search", response_model=List[CampaignResponse])
def search_campaigns(
    q: str = Query(..., min_length=1, max_length=200),
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100)
):
    """Search campaigns by title or city"""
    campaigns = db.query(Campaign).filter(
        Campaign.status == CampaignStatus.ACTIVE,
        (Campaign.title.ilike(f"%{q}%")) | (Campaign.city.ilike(f"%{q}%"))
    ).limit(limit).all()
    return campaigns

# ============ GET SINGLE CAMPAIGN ============
@router.get("/{campaign_id}", response_model=CampaignDetailResponse)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    """Get campaign details with donation stats"""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Calculate stats
    donations_count = db.query(func.count(Donation.id)).filter(
        Donation.campaign_id == campaign_id,
        Donation.status == "completed"
    ).scalar() or 0

    donor_count = db.query(func.count(Donation.user_id.distinct())).filter(
        Donation.campaign_id == campaign_id,
        Donation.status == "completed"
    ).scalar() or 0

    progress = (campaign.raised_amount / campaign.goal_amount * 100) if campaign.goal_amount > 0 else 0

    response = CampaignDetailResponse(
        **{**campaign.__dict__,
           'donations_count': donations_count,
           'donor_count': donor_count,
           'progress_percentage': round(progress, 2)}
    )
    return response

# ============ UPDATE CAMPAIGN ============
@router.put("/{campaign_id}", response_model=CampaignResponse)
def update_campaign(
    campaign_id: int,
    campaign_in: CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update campaign (only by creator)"""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this campaign")

    # Don't allow status changes via this endpoint
    update_data = campaign_in.dict(exclude_unset=True)
    if 'status' in update_data:
        del update_data['status']

    for key, value in update_data.items():
        if value is not None:
            setattr(campaign, key, value)

    db.commit()
    db.refresh(campaign)

    AuditService.log(
        db,
        action="campaign_updated",
        user_id=current_user.id,
        resource_type="campaign",
        resource_id=campaign.id
    )
    return campaign

# ============ DELETE CAMPAIGN ============
@router.delete("/{campaign_id}")
def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete campaign (only if no donations and by creator)"""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this campaign")

    # Check if campaign has donations
    donation_count = db.query(func.count(Donation.id)).filter(
        Donation.campaign_id == campaign_id
    ).scalar() or 0

    if donation_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete campaign with existing donations"
        )

    db.delete(campaign)
    db.commit()

    AuditService.log(
        db,
        action="campaign_deleted",
        user_id=current_user.id,
        resource_type="campaign",
        resource_id=campaign_id
    )
    return {"detail": "Campaign deleted"}

# ============ GET MY CAMPAIGNS ============
@router.get("/user/my-campaigns", response_model=List[CampaignResponse])
def get_my_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Get campaigns created by current user"""
    campaigns = db.query(Campaign).filter(
        Campaign.created_by == current_user.id
    ).order_by(Campaign.created_at.desc()).limit(limit).offset(offset).all()
    return campaigns

# ============ GET CAMPAIGN DONATIONS ============
@router.get("/{campaign_id}/donations", response_model=List[DonationWithDonorResponse])
def get_campaign_donations(
    campaign_id: int,
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Get donations for a campaign (public donors only if not anonymous)"""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    donations = db.query(Donation).filter(
        Donation.campaign_id == campaign_id,
        Donation.status == "completed",
        Donation.anonymous == False
    ).order_by(Donation.created_at.desc()).limit(limit).offset(offset).all()

    result = []
    for donation in donations:
        donor = db.query(User).filter(User.id == donation.user_id).first()
        result.append(DonationWithDonorResponse(
            **donation.__dict__,
            donor_name=donor.name if donor else "Anonymous",
            donor_city=donor.city if donor else None
        ))
    return result

# ============ CAMPAIGN UPDATES ============
@router.post("/{campaign_id}/updates", status_code=201)
def create_campaign_update(
    campaign_id: int,
    update_in: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a campaign update (creator only)"""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only campaign creator can post updates")

    from models import CampaignUpdate as CampaignUpdateModel

    new_update = CampaignUpdateModel(
        campaign_id=campaign_id,
        title=update_in.get('title'),
        content=update_in.get('content')
    )
    db.add(new_update)
    db.commit()
    db.refresh(new_update)

    AuditService.log(
        db,
        action="campaign_update_created",
        user_id=current_user.id,
        resource_type="campaign_update",
        resource_id=new_update.id,
        details=f"Campaign: {campaign_id}"
    )

    return {
        "id": new_update.id,
        "campaign_id": new_update.campaign_id,
        "title": new_update.title,
        "content": new_update.content,
        "created_at": new_update.created_at
    }

@router.get("/{campaign_id}/updates")
def get_campaign_updates(
    campaign_id: int,
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Get campaign updates/progress posts"""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    from models import CampaignUpdate as CampaignUpdateModel

    updates = db.query(CampaignUpdateModel).filter(
        CampaignUpdateModel.campaign_id == campaign_id
    ).order_by(CampaignUpdateModel.created_at.desc()).limit(limit).offset(offset).all()

    return [
        {
            "id": u.id,
            "campaign_id": u.campaign_id,
            "title": u.title,
            "content": u.content,
            "created_at": u.created_at
        }
        for u in updates
    ]

@router.delete("/{campaign_id}/updates/{update_id}")
def delete_campaign_update(
    campaign_id: int,
    update_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete campaign update (creator only)"""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only campaign creator can delete updates")

    from models import CampaignUpdate as CampaignUpdateModel

    update = db.query(CampaignUpdateModel).filter(
        CampaignUpdateModel.id == update_id,
        CampaignUpdateModel.campaign_id == campaign_id
    ).first()

    if not update:
        raise HTTPException(status_code=404, detail="Update not found")

    db.delete(update)
    db.commit()

    AuditService.log(
        db,
        action="campaign_update_deleted",
        user_id=current_user.id,
        resource_type="campaign_update",
        resource_id=update_id
    )

    return {"detail": "Update deleted"}

# ============ RELATED CAMPAIGNS ============
@router.get("/{campaign_id}/related")
def get_related_campaigns(
    campaign_id: int,
    db: Session = Depends(get_db),
    limit: int = Query(4, ge=1, le=20)
):
    """Get related campaigns (same category, city, active status)"""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    related = db.query(Campaign).filter(
        Campaign.id != campaign_id,
        Campaign.status == CampaignStatus.ACTIVE,
        (Campaign.category == campaign.category) | (Campaign.city == campaign.city)
    ).order_by(Campaign.created_at.desc()).limit(limit).all()

    return related

