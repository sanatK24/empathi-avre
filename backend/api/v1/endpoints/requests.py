from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from schemas import RequestCreate, RequestResponse
from models import User
from api.deps import get_active_user
from services.request_service import RequestService
from services.matching_service import MatchingService
from repositories.request_repo import request_repo
from core.exceptions import NotFoundException, ValidationException

router = APIRouter()

@router.post("", response_model=RequestResponse)
def create_request(
    data: RequestCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_active_user)
):
    return RequestService.create_request(db, current_user, data)

@router.get("/my", response_model=List[RequestResponse])
def get_my_requests(
    skip: int = 0, 
    limit: int = 100,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_active_user)
):
    return request_repo.get_by_user(db, current_user.id, skip=skip, limit=limit)

@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_active_user)
):
    return RequestService.get_stats(db, current_user)

@router.get("/{request_id}", response_model=RequestResponse)
def get_request(
    request_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_active_user)
):
    request = request_repo.get(db, request_id)
    if not request or request.user_id != current_user.id:
        raise NotFoundException("Request")
    return request

@router.get("/{request_id}/matches")
def get_matches(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    request = request_repo.get(db, request_id)
    if not request or request.user_id != current_user.id:
        raise NotFoundException("Request")
    
    matches = MatchingService.get_or_generate_matches(db, request)
    
    # Format matches for API consistency with existing frontend
    from services.feature_builder import FeatureBuilder
    from models import MatchStatus
    results = []
    
    # We sort by score descending
    sorted_matches = sorted(matches, key=lambda m: m.score, reverse=True)
    
    for rank, match in enumerate(sorted_matches, start=1):
        vendor = match.vendor
        distance = FeatureBuilder.haversine_distance(
            request.location_lat, request.location_lng,
            vendor.lat, vendor.lng
        )
        
        results.append({
            "rank": rank,
            "match_id": match.id,
            "match_status": match.status.value,
            "is_selectable": match.status in {MatchStatus.PENDING, MatchStatus.ACCEPTED_BY_VENDOR},
            "vendor_id": vendor.id,
            "vendor_name": vendor.shop_name,
            "category": vendor.category,
            "distance": round(distance, 2),
            "eta": vendor.avg_response_time,
            "score": round(match.score, 2),
            "rating": round(vendor.rating, 2),
            "explanation": match.explanation_json
        })
        
    return results

@router.post("/{request_id}/accept/{vendor_id}")
def accept_vendor(
    request_id: int,
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    request = request_repo.get(db, request_id)
    if not request or request.user_id != current_user.id:
        raise NotFoundException("Request")
        
    try:
        match = MatchingService.accept_match(db, request, vendor_id)
        vendor = match.vendor
        return {
            "message": "Vendor accepted",
            "match_id": match.id,
            "vendor_id": vendor.id,
            "vendor_name": vendor.shop_name
        }
    except Exception as e:
        raise ValidationException(str(e))

@router.post("/{request_id}/cancel")
def cancel_request(
    request_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_active_user)
):
    RequestService.cancel_request(db, current_user, request_id)
    return {"message": "Request cancelled successfully"}

@router.delete("/{request_id}")
def delete_request(
    request_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_active_user)
):
    from models import RequestStatus
    
    request = request_repo.get(db, request_id)
    if not request or request.user_id != current_user.id:
        raise NotFoundException("Request")
        
    if request.status not in {RequestStatus.PENDING, RequestStatus.CANCELLED}:
        raise ValidationException(f"Cannot delete request in {request.status.value} status")
        
    db.delete(request)
    db.commit()
    return {"message": "Request deleted"}
