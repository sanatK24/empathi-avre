from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models import User, Campaign, CampaignStatus
from schemas import CampaignResponse, CampaignCreate, DonationResponse, DonationHistoryResponse, DonationWithDonorResponse

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

@router.get("/{campaign_id}", response_model=CampaignResponse)
def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.get("/{campaign_id}/donations", response_model=List[DonationWithDonorResponse])
def get_campaign_donations(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    return donation_repo.get_by_campaign(db, campaign_id)

@router.get("/{campaign_id}/stats")
def get_campaign_stats(campaign_id: int, db: Session = Depends(get_db)):
    total = donation_repo.get_total_raised(db, campaign_id)
    from models import Donation, DonationStatus
    count = db.query(Donation).filter(Donation.campaign_id == campaign_id, Donation.status == DonationStatus.COMPLETED).count()
    return {"total_raised": total, "donor_count": count}

@router.get("/{campaign_id}/related", response_model=List[CampaignResponse])
def get_related_campaigns(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        return []
    return db.query(Campaign).filter(
        Campaign.category == campaign.category,
        Campaign.id != campaign_id,
        Campaign.status == CampaignStatus.ACTIVE
    ).limit(3).all()

@router.get("/{campaign_id}/updates")
def get_campaign_updates(campaign_id: int, db: Session = Depends(get_db)):
    from models import CampaignUpdate
    return db.query(CampaignUpdate).filter(CampaignUpdate.campaign_id == campaign_id).order_by(CampaignUpdate.created_at.desc()).all()


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
