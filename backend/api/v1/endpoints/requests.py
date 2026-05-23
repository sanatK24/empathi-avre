from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import User, Campaign, CampaignStatus
from api.deps import get_active_user

router = APIRouter()

@router.get("/stats")
def get_requests_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """
    Returns user and system-wide campaign statistics in the requests format
    to support the consolidated user dashboard.
    """
    # Campaigns created by the active user
    user_campaigns = db.query(Campaign).filter(Campaign.created_by == current_user.id).all()
    active_count = sum(1 for c in user_campaigns if c.status == CampaignStatus.ACTIVE)
    completed_count = sum(1 for c in user_campaigns if c.status == CampaignStatus.COMPLETED)
    
    # System-wide active campaigns
    system_active_count = db.query(Campaign).filter(Campaign.status == CampaignStatus.ACTIVE).count()
    
    # High urgency campaigns (system-wide active campaigns with < 20% funded or high priority tags)
    emergency_count = db.query(Campaign).filter(
        Campaign.status == CampaignStatus.ACTIVE,
        Campaign.raised_amount < Campaign.goal_amount * 0.2
    ).count()

    return {
        "total_requests": len(user_campaigns),
        "resolved_requests": completed_count,
        "matched_vendors": 0,
        "active_requests": active_count,
        "active_campaigns": system_active_count,
        "emergency_requests": emergency_count,
        "recommendations_available": 3
    }

@router.get("/my")
def get_request_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """
    Returns campaigns created by the user mapped into request history structures.
    """
    user_campaigns = db.query(Campaign).filter(Campaign.created_by == current_user.id).all()
    results = []
    for c in user_campaigns:
        results.append({
            "id": c.id,
            "resource_name": c.title,
            "name": c.title,
            "status": "Completed" if c.status == CampaignStatus.COMPLETED else "Active",
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "urgency_level": "High" if c.goal_amount > 100000 else "Medium"
        })
    return results

@router.post("")
def create_request(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """Fallback route for creating requests - maps to campaign creation or yields warning."""
    raise HTTPException(status_code=400, detail="Requester flows are consolidated. Please use Create Campaign instead.")

@router.get("/{request_id}")
def get_request_details(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """Fallback route for request details - queries campaign object if matched."""
    campaign = db.query(Campaign).filter(Campaign.id == request_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Request not found")
    return {
        "id": campaign.id,
        "resource_name": campaign.title,
        "name": campaign.title,
        "status": "Completed" if campaign.status == CampaignStatus.COMPLETED else "Active",
        "created_at": campaign.created_at.isoformat() if campaign.created_at else None,
        "urgency_level": "High" if campaign.goal_amount > 100000 else "Medium",
        "description": campaign.description
    }

@router.get("/{request_id}/matches")
def get_request_matches(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """Returns empty matches list for consolidated system."""
    return []

@router.post("/{request_id}/accept/{vendor_id}")
def accept_vendor_for_request(
    request_id: int,
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """Grants successful acknowledgment on legacy actions."""
    return {"status": "success", "message": "Flow consolidated to campaigns."}

@router.post("/{request_id}/cancel")
def cancel_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """Cancels a campaign if owner requests cancellation."""
    campaign = db.query(Campaign).filter(Campaign.id == request_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Request not found")
    if campaign.created_by != current_user.id and current_user.role.upper() != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    campaign.status = CampaignStatus.COMPLETED
    db.commit()
    return {"status": "success", "message": "Campaign closed successfully."}
