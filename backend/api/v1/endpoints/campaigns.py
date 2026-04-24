from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models import User, Campaign, CampaignStatus
from schemas import CampaignResponse, CampaignCreate, DonationResponse, DonationHistoryResponse

from api.deps import get_active_user
from services.campaign_service import CampaignService
from repositories.campaign_repo import campaign_repo
from repositories.donation_repo import donation_repo

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
    city: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Campaign).filter(Campaign.status == CampaignStatus.ACTIVE)

    if category:
        query = query.filter(Campaign.category == category)
    if city:
        query = query.filter(Campaign.city == city)
    
    return query.offset(skip).limit(limit).all()


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


@router.get("/my", response_model=List[CampaignResponse])
def get_my_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    return campaign_repo.get_by_creator(db, current_user.id)


@router.get("/my-donations", response_model=List[DonationHistoryResponse])
def get_my_donations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    donations = donation_repo.get_user_donation_history(db, current_user.id)
    # Map campaign titles
    results = []
    for d in donations:
        res = DonationHistoryResponse.from_orm(d)
        res.campaign_title = d.campaign.title if d.campaign else "Unknown Campaign"
        results.append(res)
    return results
