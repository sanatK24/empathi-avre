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
    import json
    results = []
    
    # We sort by score descending
    sorted_matches = sorted(matches, key=lambda m: m.score, reverse=True)
    
    for rank, match in enumerate(sorted_matches, start=1):
        vendor = match.vendor
        distance = FeatureBuilder.haversine_distance(
            request.location_lat, request.location_lng,
            vendor.lat, vendor.lng
        )
        
        # Safely parse explanation_json
        explanation_text = match.explanation_json
        if match.explanation_json:
            try:
                exp_data = json.loads(match.explanation_json)
                if isinstance(exp_data, dict) and "text" in exp_data:
                    explanation_text = exp_data["text"]
            except Exception:
                pass
        
        # Phase 2: parse trust signals from explanation_json if available
        trust_data = {}
        if match.explanation_json:
            try:
                exp_obj = json.loads(match.explanation_json)
                if isinstance(exp_obj, dict) and "trust" in exp_obj:
                    trust_data = exp_obj["trust"] or {}
            except Exception:
                pass

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
            "rating": round(vendor.rating, 2) if vendor.rating is not None else 3.5,
            "explanation": explanation_text,
            "lgbm_score": match.lgbm_score,
            "fairness_penalty_applied": match.fairness_penalty_applied,
            # Phase 2: decomposed trust signals (nullable — backward compatible)
            "trust_score": match.trust_score,
            "fulfillment_score": trust_data.get("fulfillment_score"),
            "dispute_risk": trust_data.get("dispute_risk"),
            "delivery_reliability": trust_data.get("delivery_reliability"),
            "anomaly_risk": trust_data.get("anomaly_risk"),
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
