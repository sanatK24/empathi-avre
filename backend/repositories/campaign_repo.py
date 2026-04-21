from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import Campaign, CampaignStatus
from repositories.base_repo import BaseRepo

class CampaignRepo(BaseRepo[Campaign]):
    def __init__(self):
        super().__init__(Campaign)

    def get_active(self, db: Session, skip: int = 0, limit: int = 20) -> List[Campaign]:
        return db.query(Campaign).filter(
            Campaign.status == CampaignStatus.ACTIVE
        ).order_by(Campaign.created_at.desc()).offset(skip).limit(limit).all()

    def get_by_creator(self, db: Session, user_id: int) -> List[Campaign]:
        return db.query(Campaign).filter(Campaign.created_by == user_id).all()

    def search(self, db: Session, q: str, limit: int = 20) -> List[Campaign]:
        return db.query(Campaign).filter(
            Campaign.status == CampaignStatus.ACTIVE,
            (Campaign.title.ilike(f"%{q}%")) | (Campaign.city.ilike(f"%{q}%"))
        ).limit(limit).all()

    def get_category_stats(self, db: Session):
        return db.query(
            Campaign.category,
            func.count(Campaign.id).label('count'),
            func.sum(Campaign.raised_amount).label('total_raised')
        ).group_by(Campaign.category).all()

campaign_repo = CampaignRepo()
