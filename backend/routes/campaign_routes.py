from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from database import get_db
from models import Campaign, Donation, User, CampaignStatus, UrgencyLevel
from schemas import (
    CampaignCreate, CampaignUpdate, CampaignResponse, CampaignDetailResponse, 
    DonationResponse, DonationWithDonorResponse, CampaignUpdateCreate, 
    CampaignUpdateResponse, UpdateCommentCreate, UpdateCommentResponse
)
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
@router.post("/{campaign_id}/updates", response_model=CampaignUpdateResponse, status_code=201)
def create_campaign_update(
    campaign_id: int,
    update_in: CampaignUpdateCreate,
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
        created_by=current_user.id,
        content=update_in.content,
        image_url=update_in.image_url
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

    return _format_update_response(new_update, current_user.id, db)

@router.get("/{campaign_id}/updates", response_model=List[CampaignUpdateResponse])
def get_campaign_updates(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Get campaign updates/progress posts (pinned first)"""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    from models import CampaignUpdate as CampaignUpdateModel

    updates = db.query(CampaignUpdateModel).filter(
        CampaignUpdateModel.campaign_id == campaign_id
    ).order_by(
        CampaignUpdateModel.is_pinned.desc(),
        CampaignUpdateModel.created_at.desc()
    ).limit(limit).offset(offset).all()

    user_id = current_user.id if current_user else None
    return [_format_update_response(u, user_id, db) for u in updates]

@router.post("/{campaign_id}/updates/{update_id}/like")
def like_update(
    campaign_id: int,
    update_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Like a campaign update"""
    from models import CampaignUpdate as CampaignUpdateModel, UpdateLike

    update = db.query(CampaignUpdateModel).filter(
        CampaignUpdateModel.id == update_id,
        CampaignUpdateModel.campaign_id == campaign_id
    ).first()

    if not update:
        raise HTTPException(status_code=404, detail="Update not found")

    existing_like = db.query(UpdateLike).filter(
        UpdateLike.update_id == update_id,
        UpdateLike.user_id == current_user.id
    ).first()

    if existing_like:
        raise HTTPException(status_code=400, detail="Already liked")

    like = UpdateLike(update_id=update_id, user_id=current_user.id)
    db.add(like)
    db.commit()

    return {"detail": "Liked successfully"}

@router.post("/{campaign_id}/updates/{update_id}/unlike")
def unlike_update(
    campaign_id: int,
    update_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Unlike a campaign update"""
    from models import CampaignUpdate as CampaignUpdateModel, UpdateLike

    update = db.query(CampaignUpdateModel).filter(
        CampaignUpdateModel.id == update_id,
        CampaignUpdateModel.campaign_id == campaign_id
    ).first()

    if not update:
        raise HTTPException(status_code=404, detail="Update not found")

    like = db.query(UpdateLike).filter(
        UpdateLike.update_id == update_id,
        UpdateLike.user_id == current_user.id
    ).first()

    if not like:
        raise HTTPException(status_code=400, detail="Not liked")

    db.delete(like)
    db.commit()

    return {"detail": "Unliked successfully"}

@router.post("/{campaign_id}/updates/{update_id}/comments", response_model=UpdateCommentResponse, status_code=201)
def add_update_comment(
    campaign_id: int,
    update_id: int,
    comment_in: UpdateCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a comment to a campaign update"""
    from models import CampaignUpdate as CampaignUpdateModel, UpdateComment

    update = db.query(CampaignUpdateModel).filter(
        CampaignUpdateModel.id == update_id,
        CampaignUpdateModel.campaign_id == campaign_id
    ).first()

    if not update:
        raise HTTPException(status_code=404, detail="Update not found")

    new_comment = UpdateComment(
        update_id=update_id,
        user_id=current_user.id,
        text=comment_in.text
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    return _format_comment_response(new_comment, db)

@router.delete("/{campaign_id}/updates/{update_id}/comments/{comment_id}")
def delete_update_comment(
    campaign_id: int,
    update_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a comment (creator of comment or campaign creator only)"""
    from models import CampaignUpdate as CampaignUpdateModel, UpdateComment

    update = db.query(CampaignUpdateModel).filter(
        CampaignUpdateModel.id == update_id,
        CampaignUpdateModel.campaign_id == campaign_id
    ).first()

    if not update:
        raise HTTPException(status_code=404, detail="Update not found")

    comment = db.query(UpdateComment).filter(
        UpdateComment.id == comment_id,
        UpdateComment.update_id == update_id
    ).first()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.user_id != current_user.id and update.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    db.delete(comment)
    db.commit()

    return {"detail": "Comment deleted"}

@router.put("/{campaign_id}/updates/{update_id}/pin")
def toggle_pin_update(
    campaign_id: int,
    update_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Pin or unpin an update (campaign creator only)"""
    from models import CampaignUpdate as CampaignUpdateModel

    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only campaign creator can pin updates")

    update = db.query(CampaignUpdateModel).filter(
        CampaignUpdateModel.id == update_id,
        CampaignUpdateModel.campaign_id == campaign_id
    ).first()

    if not update:
        raise HTTPException(status_code=404, detail="Update not found")

    update.is_pinned = not update.is_pinned
    db.commit()

    return {"detail": "Update pinned" if update.is_pinned else "Update unpinned", "is_pinned": update.is_pinned}

# ============ HELPER FUNCTIONS ============
def _format_update_response(update, user_id: Optional[int], db: Session):
    """Format a campaign update with counts and user info"""
    from models import UpdateComment, UpdateLike
    
    comments_count = db.query(func.count(UpdateComment.id)).filter(
        UpdateComment.update_id == update.id
    ).scalar() or 0
    
    likes_count = db.query(func.count(UpdateLike.id)).filter(
        UpdateLike.update_id == update.id
    ).scalar() or 0
    
    is_liked = False
    if user_id:
        is_liked = db.query(UpdateLike).filter(
            UpdateLike.update_id == update.id,
            UpdateLike.user_id == user_id
        ).first() is not None
    
    return {
        "id": update.id,
        "campaign_id": update.campaign_id,
        "created_by": update.created_by,
        "content": update.content,
        "image_url": update.image_url,
        "is_pinned": update.is_pinned,
        "created_at": update.created_at,
        "creator": {
            "id": update.creator.id,
            "name": update.creator.name,
            "email": update.creator.email,
            "avatar_url": update.creator.avatar_url
        },
        "comments_count": comments_count,
        "likes_count": likes_count,
        "is_liked_by_user": is_liked
    }

def _format_comment_response(comment, db: Session):
    """Format a comment with user info"""
    return {
        "id": comment.id,
        "update_id": comment.update_id,
        "user_id": comment.user_id,
        "text": comment.text,
        "created_at": comment.created_at,
        "user": {
            "id": comment.user.id,
            "name": comment.user.name,
            "email": comment.user.email,
            "avatar_url": comment.user.avatar_url
        }
    }

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

