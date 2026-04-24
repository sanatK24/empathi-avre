from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import Donation, DonationStatus
from repositories.base_repo import BaseRepo

class DonationRepo(BaseRepo[Donation]):
    def __init__(self):
        super().__init__(Donation)

    def get_by_campaign(self, db: Session, campaign_id: int) -> List[Donation]:
        return db.query(Donation).filter(
            Donation.campaign_id == campaign_id,
            Donation.status == DonationStatus.COMPLETED
        ).order_by(Donation.created_at.desc()).all()

    def get_total_raised(self, db: Session, campaign_id: int) -> float:
        return db.query(func.sum(Donation.amount)).filter(
            Donation.campaign_id == campaign_id,
            Donation.status == DonationStatus.COMPLETED
        ).scalar() or 0.0

    def get_user_donation_history(self, db: Session, user_id: int) -> List[Donation]:
        return db.query(Donation).filter(Donation.user_id == user_id).all()

donation_repo = DonationRepo()
