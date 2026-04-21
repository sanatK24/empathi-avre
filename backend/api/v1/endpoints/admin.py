from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from database import get_db
from models import User, UserRole, Vendor, Campaign
from api.deps import get_current_admin
from services.admin_service import AdminService
from schemas import AdminStats, CampaignVerifyRequest

router = APIRouter()

@router.get("/stats", response_model=AdminStats)
def get_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    return AdminService.get_system_stats(db)

@router.get("/users")
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    return db.query(User).offset(skip).limit(limit).all()

@router.get("/vendors")
def list_vendors(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    return db.query(Vendor).offset(skip).limit(limit).all()

@router.get("/campaigns")
def list_campaigns(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    return db.query(Campaign).offset(skip).limit(limit).all()

@router.put("/campaigns/{campaign_id}/verify")
def verify_campaign(
    campaign_id: int,
    verified: bool = True,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    result = AdminService.verify_campaign(db, admin, campaign_id, verified)
    if not result:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Success", "verified": result.verified}

@router.put("/vendors/{vendor_id}/verification")
def update_vendor_verification(
    vendor_id: int,
    status: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    result = AdminService.update_vendor_verification(db, admin, vendor_id, status)
    if not result:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {"message": "Success", "status": result.verification_status}
    
@router.put("/campaigns/{campaign_id}/flag")
def flag_campaign(
    campaign_id: int,
    flagged: bool = True,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    result = AdminService.flag_campaign(db, admin, campaign_id, flagged)
    if not result:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Success", "is_flagged": result.is_flagged}
    
@router.delete("/campaigns/{campaign_id}")
def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    success = AdminService.delete_campaign(db, admin, campaign_id)
    if not success:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Campaign deleted successfully"}
