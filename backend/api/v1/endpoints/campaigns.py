from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models import User, Campaign
from schemas import CampaignResponse, CampaignCreate, DonationResponse
from api.deps import get_active_user
from services.campaign_service import CampaignService
from repositories.campaign_repo import campaign_repo

router = APIRouter()

@router.post("", response_model=CampaignResponse)
def create_campaign(
    data: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    return CampaignService.create_campaign(db, current_user, data)

@router.get("", response_model=List[CampaignResponse])
def list_campaigns(
    skip: int = 0,
    limit: int = 20,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    if category:
        return db.query(Campaign).filter(Campaign.category == category).offset(skip).limit(limit).all()
    return campaign_repo.get_active(db, skip=skip, limit=limit)

@router.get("/recommendations")
def get_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    return CampaignService.get_recommendations(db, current_user)

@router.post("/{campaign_id}/donate", response_model=DonationResponse)
def donate(
    campaign_id: int,
    amount: float,
    anonymous: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    return CampaignService.add_donation(db, current_user, campaign_id, amount, anonymous)

@router.get("/stats/categories")
def get_cat_stats(db: Session = Depends(get_db)):
    return campaign_repo.get_category_stats(db)
