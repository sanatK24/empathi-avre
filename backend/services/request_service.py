from typing import List, Optional
from sqlalchemy.orm import Session
from models import User, Request, RequestStatus, Match, MatchStatus
from schemas import RequestCreate
from repositories.request_repo import request_repo
from repositories.match_repo import match_repo
from core.exceptions import NotFoundException, ValidationException
from core.logging import logger
from services.audit import AuditService
from realtime import emit_and_broadcast_sync
from events import EventType

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
        
        # Emit Real-time Event
        emit_and_broadcast_sync(
            EventType.REQUEST_FLAGGED, # Using existing type for now
            {
                "request_id": new_request.id,
                "requester_id": user.id,
                "resource_name": new_request.resource_name,
                "urgency": new_request.urgency_level.value
            }
        )
        
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
        
        # Emit Real-time Event (for affected vendors)
        affected_matches = db.query(Match).filter(
            Match.request_id == request_id,
            Match.status == MatchStatus.CANCELLED_BY_REQUESTER
        ).all()
        affected_vendor_ids = [m.vendor_id for m in affected_matches]
        
        if affected_vendor_ids:
            emit_and_broadcast_sync(
                EventType.MATCH_CANCELLED,
                {
                    "request_id": request_id,
                    "requester_id": user.id,
                    "affected_vendor_ids": affected_vendor_ids
                }
            )
            
        return request

    @staticmethod
    def get_stats(db: Session, user: User) -> dict:
        total = db.query(Request).filter(Request.user_id == user.id).count()
        active = request_repo.get_active_count_by_user(db, user.id)
        resolved = request_repo.get_resolved_count_by_user(db, user.id)
        
        return {
            "active_requests": active,
            "resolved_requests": resolved,
            "total_requests": total,
            "avg_match_time": "Calculated after more matches", # Non-static fallback
            "pending_response": active
        }
