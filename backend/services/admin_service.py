from typing import Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import User, Vendor, Request, Match, Campaign, CampaignStatus, VerificationStatus, UserRole
from repositories.audit_repo import audit_repo
from realtime import emit_and_broadcast_sync
from events import EventType

class AdminService:
    @staticmethod
    def get_system_stats(db: Session) -> Dict[str, Any]:
        total_users = db.query(User).count()
        total_vendors = db.query(Vendor).count()
        total_requests = db.query(Request).count()
        total_matches = db.query(Match).count()
        
        avg_score = db.query(func.avg(Match.score)).scalar() or 0.0
        
        return {
            "total_users": total_users,
            "total_vendors": total_vendors,
            "total_requests": total_requests,
            "total_matches": total_matches,
            "active_vendors": db.query(Vendor).filter(Vendor.is_active == True).count(),
            "unverified_vendors": db.query(Vendor).filter(Vendor.verification_status != VerificationStatus.VERIFIED).count(),
            "total_requesters": db.query(User).filter(User.role == UserRole.REQUESTER).count(),
            "avg_match_score": float(avg_score),
            "system_alerts": 0,
            "match_rate": 100.0 if total_requests > 0 else 0.0,
            "match_activity": [],
            "category_distribution": []
        }

    @staticmethod
    def verify_campaign(db: Session, admin: User, campaign_id: int, verified: bool):
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            return None
            
        campaign.verified = verified
        db.commit()
        
        audit_repo.log(
            db,
            action=f"campaign_{'verified' if verified else 'unverified'}",
            user_id=admin.id,
            resource_type="campaign",
            resource_id=campaign_id
        )
        return campaign

    @staticmethod
    def update_vendor_verification(db: Session, admin: User, vendor_id: int, status: str):
        vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
        if not vendor:
            return None
            
        vendor.verification_status = status
        db.commit()
        
        audit_repo.log(
            db,
            action=f"vendor_verification_{status}",
            user_id=admin.id,
            resource_type="vendor",
            resource_id=vendor_id
        )
        
        # Emit Real-time Event
        event_type = EventType.VENDOR_VERIFIED if status == VerificationStatus.VERIFIED else EventType.VENDOR_REJECTED
        emit_and_broadcast_sync(
            event_type,
            {
                "vendor_id": vendor_id,
                "vendor_name": vendor.shop_name,
                "status": status
            }
        )
        
        return vendor

    @staticmethod
    def flag_campaign(db: Session, admin: User, campaign_id: int, flagged: bool = True):
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            return None
        campaign.is_flagged = flagged
        db.commit()
        audit_repo.log(
            db, action=f"campaign_{'flagged' if flagged else 'unflagged'}",
            user_id=admin.id, resource_type="campaign", resource_id=campaign_id
        )
        return campaign

    @staticmethod
    def delete_campaign(db: Session, admin: User, campaign_id: int):
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            return False
            
        db.delete(campaign)
        db.commit()
        
        audit_repo.log(
            db,
            action="campaign_deleted",
            user_id=admin.id,
            resource_type="campaign",
            resource_id=campaign_id
        )
        return True
