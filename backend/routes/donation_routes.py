from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Donation, Campaign, User, DonationStatus
from schemas import DonationCreate, DonationResponse
from auth import get_current_user
from services.audit import AuditService
from typing import List
from datetime import datetime

router = APIRouter(prefix="/donations", tags=["donations"])

# ============ CREATE DONATION ============
@router.post("/", response_model=DonationResponse, status_code=201)
def create_donation(
    campaign_id: int,
    donation_in: DonationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new donation for a campaign"""
    # Verify campaign exists and is active
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.status != "active":
        raise HTTPException(status_code=400, detail="Campaign is not active")

    # Validate amount
    if donation_in.amount <= 0:
        raise HTTPException(status_code=400, detail="Donation amount must be greater than 0")

    # Create donation
    new_donation = Donation(
        campaign_id=campaign_id,
        user_id=current_user.id,
        amount=donation_in.amount,
        anonymous=donation_in.anonymous,
        message=donation_in.message,
        status=DonationStatus.COMPLETED
    )

    # Update campaign raised amount
    campaign.raised_amount += donation_in.amount

    # Check if campaign is now fully funded
    if campaign.raised_amount >= campaign.goal_amount:
        campaign.status = "completed"

    db.add(new_donation)
    db.commit()
    db.refresh(new_donation)

    # Audit log
    AuditService.log(
        db,
        action="donation_created",
        user_id=current_user.id,
        resource_type="donation",
        resource_id=new_donation.id,
        details=f"Amount: {donation_in.amount}, Campaign: {campaign_id}"
    )

    return new_donation

# ============ GET MY DONATIONS ============
@router.get("/me", response_model=List[DonationResponse])
def get_my_donations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 20,
    offset: int = 0
):
    """Get donations made by current user"""
    donations = db.query(Donation).filter(
        Donation.user_id == current_user.id
    ).order_by(Donation.created_at.desc()).limit(limit).offset(offset).all()
    return donations

# ============ GET DONATION DETAILS ============
@router.get("/{donation_id}", response_model=DonationResponse)
def get_donation(
    donation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get donation details (only accessible by donor or admins)"""
    donation = db.query(Donation).filter(Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")

    # Check authorization
    if donation.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view this donation")

    return donation

# ============ GET CAMPAIGN DONATION STATS ============
@router.get("/campaign/{campaign_id}/stats")
def get_campaign_donation_stats(campaign_id: int, db: Session = Depends(get_db)):
    """Get donation statistics for a campaign"""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    total_donations = db.query(func.count(Donation.id)).filter(
        Donation.campaign_id == campaign_id,
        Donation.status == "completed"
    ).scalar() or 0

    unique_donors = db.query(func.count(Donation.user_id.distinct())).filter(
        Donation.campaign_id == campaign_id,
        Donation.status == "completed"
    ).scalar() or 0

    total_raised = db.query(func.sum(Donation.amount)).filter(
        Donation.campaign_id == campaign_id,
        Donation.status == "completed"
    ).scalar() or 0.0

    avg_donation = db.query(func.avg(Donation.amount)).filter(
        Donation.campaign_id == campaign_id,
        Donation.status == "completed"
    ).scalar() or 0.0

    progress_percentage = (campaign.raised_amount / campaign.goal_amount * 100) if campaign.goal_amount > 0 else 0

    return {
        "campaign_id": campaign_id,
        "total_donations": total_donations,
        "unique_donors": unique_donors,
        "total_raised": round(total_raised, 2),
        "average_donation": round(avg_donation, 2),
        "goal_amount": campaign.goal_amount,
        "progress_percentage": round(progress_percentage, 2),
        "status": campaign.status,
        "is_funded": campaign.raised_amount >= campaign.goal_amount
    }

# ============ CANCEL DONATION (ADMIN ONLY) ============
@router.post("/{donation_id}/cancel")
def cancel_donation(
    donation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel a donation and refund amount (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    donation = db.query(Donation).filter(Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")

    if donation.status == DonationStatus.REFUNDED:
        raise HTTPException(status_code=400, detail="Donation already refunded")

    # Update donation status
    donation.status = DonationStatus.REFUNDED

    # Update campaign raised amount
    campaign = db.query(Campaign).filter(Campaign.id == donation.campaign_id).first()
    if campaign:
        campaign.raised_amount -= donation.amount
        # If campaign was completed and now isn't, revert status
        if campaign.status == "completed" and campaign.raised_amount < campaign.goal_amount:
            campaign.status = "active"

    db.commit()

    AuditService.log(
        db,
        action="donation_refunded",
        user_id=current_user.id,
        resource_type="donation",
        resource_id=donation_id,
        details=f"Amount refunded: {donation.amount}"
    )

    return {
        "detail": "Donation refunded",
        "donation_id": donation_id,
        "amount_refunded": donation.amount
    }
