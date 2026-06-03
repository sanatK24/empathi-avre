from typing import Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import User, Campaign, CampaignStatus, UserRole
from repositories.audit_repo import audit_repo

class AdminService:

    @staticmethod
    def get_system_stats(db: Session) -> Dict[str, Any]:
        total_users = db.query(User).count()
        total_campaigns = db.query(Campaign).count()
        return {'total_users': total_users, 'total_campaigns': total_campaigns, 'active_campaigns': db.query(Campaign).filter(Campaign.status == CampaignStatus.ACTIVE).count(), 'total_donors': db.query(User).filter(User.role == UserRole.DONOR).count(), 'system_alerts': 0}

    @staticmethod
    def verify_campaign(db: Session, admin: User, campaign_id: int, verified: bool):
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            return None
        campaign.verified = verified
        db.commit()
        audit_repo.log(db, action=f"campaign_{('verified' if verified else 'unverified')}", user_id=admin.id, resource_type='campaign', resource_id=campaign_id)
        return campaign

    @staticmethod
    def flag_campaign(db: Session, admin: User, campaign_id: int, flagged: bool=True):
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            return None
        campaign.is_flagged = flagged
        db.commit()
        audit_repo.log(db, action=f"campaign_{('flagged' if flagged else 'unflagged')}", user_id=admin.id, resource_type='campaign', resource_id=campaign_id)
        return campaign

    @staticmethod
    def delete_campaign(db: Session, admin: User, campaign_id: int):
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            return False
        db.delete(campaign)
        db.commit()
        audit_repo.log(db, action='campaign_deleted', user_id=admin.id, resource_type='campaign', resource_id=campaign_id)
        return True