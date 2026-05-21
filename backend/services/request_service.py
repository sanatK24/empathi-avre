from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import (
    User, Request, RequestStatus, Match, MatchStatus,
    Donation, DonationStatus, Campaign, CampaignStatus, UrgencyLevel
)
from schemas import RequestCreate
from repositories.request_repo import request_repo
from repositories.match_repo import match_repo
from core.exceptions import NotFoundException, ValidationException
from core.logging import logger
from services.audit import AuditService

class RequestService:
    @staticmethod
    def create_request(db: Session, user: User, data: RequestCreate) -> Request:
        # Validation
        if not data.resource_name.strip():
            raise ValidationException("Resource name is required")
        
        new_request = Request(
            user_id=user.id,
            resource_name=data.resource_name.strip(),
            category=data.category,
            quantity=data.quantity,
            location_lat=data.location_lat,
            location_lng=data.location_lng,
            city=data.city,
            urgency_level=data.urgency_level,
            notes=data.notes.strip() if data.notes else None,
            status=RequestStatus.PENDING
        )
        
        request = request_repo.create(db, obj_in=new_request) # Note: create in base_repo is minimal, using add/commit here
        db.add(new_request)
        db.commit()
        db.refresh(new_request)
        
        AuditService.log(db, "request_created", user_id=user.id, resource_id=new_request.id, resource_type="request")
        
        
        return new_request

    @staticmethod
    def cancel_request(db: Session, user: User, request_id: int) -> Request:
        request = request_repo.get(db, request_id)
        if not request or request.user_id != user.id:
            raise NotFoundException("Request")
        
        if request.status in {RequestStatus.COMPLETED, RequestStatus.CANCELLED}:
            raise ValidationException(f"Cannot cancel a {request.status.value} request")
            
        request.status = RequestStatus.CANCELLED
        
        # Also cancel all active matches
        db.query(Match).filter(
            Match.request_id == request_id,
            Match.status.in_([MatchStatus.PENDING, MatchStatus.ACCEPTED_BY_VENDOR])
        ).update({"status": MatchStatus.CANCELLED_BY_REQUESTER})
        
        db.commit()
        db.refresh(request)
        
            
        return request

    @staticmethod
    def get_stats(db: Session, user: User) -> dict:
        total = db.query(Request).filter(Request.user_id == user.id).count()
        active = request_repo.get_active_count_by_user(db, user.id)
        resolved = request_repo.get_resolved_count_by_user(db, user.id)

        # Matched vendors: distinct vendors matched to user's requests
        user_request_ids = db.query(Request.id).filter(Request.user_id == user.id).subquery()
        matched_vendors = db.query(func.count(func.distinct(Match.vendor_id))).filter(
            Match.request_id.in_(db.query(Request.id).filter(Request.user_id == user.id)),
            Match.status.in_([
                MatchStatus.ACCEPTED_BY_VENDOR,
                MatchStatus.ACCEPTED_BY_REQUESTER,
                MatchStatus.PENDING,
            ])
        ).scalar() or 0

        # Donations total
        donations_made = db.query(func.coalesce(func.sum(Donation.amount), 0)).filter(
            Donation.user_id == user.id,
            Donation.status == DonationStatus.COMPLETED,
        ).scalar() or 0

        # Active campaigns created by user
        active_campaigns = db.query(Campaign).filter(
            Campaign.created_by == user.id,
            Campaign.status == CampaignStatus.ACTIVE,
        ).count()

        # Emergency requests
        emergency_requests = db.query(Request).filter(
            Request.user_id == user.id,
            Request.urgency_level.in_([UrgencyLevel.CRITICAL, UrgencyLevel.HIGH]),
        ).count()

        try:
            from services.campaign_service import CampaignService
            recommendations_count = len(CampaignService.get_recommendations(db, user))
        except Exception as e:
            print("ERROR IN GET_STATS RECOMMENDATIONS:", e)
            import traceback
            traceback.print_exc()
            recommendations_count = 0

        return {
            "active_requests": active,
            "resolved_requests": resolved,
            "total_requests": total,
            "matched_vendors": matched_vendors,
            "donations_made": float(donations_made),
            "active_campaigns": active_campaigns,
            "emergency_requests": emergency_requests,
            "recommendations_available": recommendations_count,
            "avg_match_time": "Calculated after more matches",
            "pending_response": active,
        }

