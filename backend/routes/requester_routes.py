from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict
from sqlalchemy.orm import Session
from database import get_db
from models import User, Request as DBRequest, Match, UserRole, RequestStatus, MatchStatus, Vendor
from schemas import RequestCreate, RequestResponse
from auth import get_current_user
from services.empathi_engine import EmpathIEngine
from services.feature_builder import FeatureBuilder
from realtime import emit_and_broadcast_sync
from events import EventType
import asyncio
import anyio
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/requests", tags=["Requester"])

MATCHABLE_REQUEST_STATUSES = {
    RequestStatus.PENDING,
    RequestStatus.MATCHED,
}

ACCEPTABLE_REQUEST_STATUSES = {
    RequestStatus.PENDING,
    RequestStatus.MATCHED,
}

CANCELLABLE_REQUEST_STATUSES = {
    RequestStatus.PENDING,
    RequestStatus.MATCHED,
}

def get_current_requester(user: User = Depends(get_current_user)):
    """Get current requester user."""
    if user.role != UserRole.REQUESTER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only requesters can access this")
    return user

def update_vendor_rating_on_acceptance(vendor: Vendor, match: Match, db: Session) -> float:
    """
    Update vendor rating using rolling average when requester accepts them.
    
    Uses EmpathI match score (combination of distance/stock/rating/speed/urgency) as input.
    Formula: new_rating = (old_rating * count + match_score) / (count + 1)
    where count = number of previously accepted matches from this vendor
    
    Returns: new_rating value
    """
    # Count prior accepted matches for this vendor
    prior_accepted_count = db.query(Match).filter(
        Match.vendor_id == vendor.id,
        Match.status == MatchStatus.ACCEPTED_BY_REQUESTER
    ).count()
    
    # Use match score as quality indicator
    match_score = float(match.score)
    
    # Calculate rolling average
    if prior_accepted_count == 0:
        # First acceptance: rating becomes the match score
        new_rating = match_score
    else:
        # Rolling average with existing rating
        new_rating = (vendor.rating * prior_accepted_count + match_score) / (prior_accepted_count + 1)
    
    # Update vendor rating (bounded 0-100)
    vendor.rating = min(100.0, max(0.0, new_rating))
    db.commit()
    return new_rating

# ============ CREATE REQUEST ============
@router.post("/", response_model=RequestResponse)
def create_request(
    request_data: RequestCreate,
    user: User = Depends(get_current_requester),
    db: Session = Depends(get_db)
):
    """Submit a new resource request."""
    resource_name = request_data.resource_name.strip()
    if not resource_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resource name is required",
        )

    if not (-90 <= request_data.location_lat <= 90):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Latitude must be between -90 and 90",
        )

    if not (-180 <= request_data.location_lng <= 180):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Longitude must be between -180 and 180",
        )

    notes = request_data.notes.strip() if request_data.notes else None

    db_request = DBRequest(
        user_id=user.id,
        resource_name=resource_name,
        category=request_data.category,
        quantity=request_data.quantity,
        location_lat=request_data.location_lat,
        location_lng=request_data.location_lng,
        city=request_data.city,
        urgency_level=request_data.urgency_level,
        notes=notes,
        status=RequestStatus.PENDING
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)

    # Emit request creation event asynchronously (non-blocking)
    try:
        emit_and_broadcast_sync(
            EventType.REQUEST_FLAGGED, # Should probably be REQUEST_CREATED if it existed, but using what's available
            {
                "request_id": db_request.id,
                "requester_id": user.id,
                "resource_name": resource_name,
                "urgency": request_data.urgency_level.value,
                "location": {
                    "latitude": request_data.location_lat,
                    "longitude": request_data.location_lng
                }
            }
        )
    except Exception as e:
        # Log but don't fail the request if event emission fails
        logger.error(f"Failed to emit request created event: {e}")

    return db_request

# ============ VIEW MATCHES ============
@router.get("/{request_id}/matches", response_model=list)
def get_matches(
    request_id: int,
    user: User = Depends(get_current_requester),
    db: Session = Depends(get_db)
):
    """
    Get ranked vendor matches for a request.
    Triggers EmpathI engine if no matches exist yet.
    """
    request = db.query(DBRequest).filter(
        DBRequest.id == request_id,
        DBRequest.user_id == user.id
    ).first()
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    if request.status in {RequestStatus.CANCELLED, RequestStatus.COMPLETED}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot fetch matches for {request.status.value} request",
        )

    # Check if matches already exist
    existing_matches = db.query(Match).filter(Match.request_id == request_id).all()
    if not existing_matches and request.status in MATCHABLE_REQUEST_STATUSES:
        # Run EmpathI engine
        engine = EmpathIEngine()
        candidates = engine.match(db, request)

        # Save matches to database and emit vendor.matched events
        for candidate in candidates:
            # Get the vendor object using vendor_id
            vendor = db.query(Vendor).filter(Vendor.id == candidate["vendor_id"]).first()
            if not vendor:
                continue

            match = Match(
                request_id=request_id,
                vendor_id=candidate["vendor_id"],
                score=candidate["relevance_score"],
                distance_score=candidate["relevance_score"] * 0.35,  # Approximation
                stock_score=candidate["relevance_score"] * 0.20,
                rating_score=candidate["relevance_score"] * 0.15,
                speed_score=candidate["relevance_score"] * 0.15,
                urgency_score=candidate["relevance_score"] * 0.15,
                status=MatchStatus.PENDING
            )
            db.add(match)

            # Emit vendor matched event (notify vendor of new opportunity)
            try:
                emit_and_broadcast_sync(
                    EventType.VENDOR_MATCHED,
                    {
                        "vendor_id": candidate["vendor_id"],
                        "request_id": request_id,
                        "resource_name": request.resource_name,
                        "urgency": request.urgency_level.value,
                        "match_score": round(candidate["relevance_score"], 2)
                    }
                )
            except Exception as e:
                logger.error(f"Failed to emit vendor matched event: {e}")

        db.commit()
        existing_matches = db.query(Match).filter(Match.request_id == request_id).all()

    # Format matches for response
    results = []
    sorted_matches = sorted(existing_matches, key=lambda m: m.score, reverse=True)
    for rank, match in enumerate(sorted_matches, start=1):
        vendor = match.vendor
        distance = FeatureBuilder.haversine_distance(
            request.location_lat,
            request.location_lng,
            vendor.lat,
            vendor.lng,
        )
        result = {
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
            "rating": round(vendor.rating, 2)
        }
        results.append(result)

    # Update request status
    if results and request.status == RequestStatus.PENDING:
        request.status = RequestStatus.MATCHED
        db.commit()

    return results

# ============ ACCEPT VENDOR ============
@router.post("/{request_id}/accept/{vendor_id}")
def accept_vendor(
    request_id: int,
    vendor_id: int,
    user: User = Depends(get_current_requester),
    db: Session = Depends(get_db)
):
    """Requester accepts a vendor match."""
    if request_id <= 0 or vendor_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request_id or vendor_id",
        )

    request = db.query(DBRequest).filter(
        DBRequest.id == request_id,
        DBRequest.user_id == user.id
    ).first()
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    if request.status not in ACCEPTABLE_REQUEST_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot accept vendor for request in {request.status.value} state",
        )

    existing_accepted_match = db.query(Match).filter(
        Match.request_id == request_id,
        Match.status == MatchStatus.ACCEPTED_BY_REQUESTER,
    ).first()

    if existing_accepted_match:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A vendor has already been accepted for this request",
        )

    match = db.query(Match).filter(
        Match.request_id == request_id,
        Match.vendor_id == vendor_id
    ).first()
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor match not found")

    if match.status not in {MatchStatus.PENDING, MatchStatus.ACCEPTED_BY_VENDOR}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot accept vendor from match state {match.status.value}",
        )

    # Close all other unresolved candidates once requester selects one vendor.
    db.query(Match).filter(
        Match.request_id == request_id,
        Match.vendor_id != vendor_id,
        Match.status.in_([MatchStatus.PENDING, MatchStatus.ACCEPTED_BY_VENDOR]),
    ).update(
        {Match.status: MatchStatus.CANCELLED_BY_REQUESTER},
        synchronize_session=False,
    )

    match.status = MatchStatus.ACCEPTED_BY_REQUESTER
    request.status = RequestStatus.ACCEPTED
    
    # Update vendor rating immediately on acceptance (FR-307)
    vendor = match.vendor
    new_rating = update_vendor_rating_on_acceptance(vendor, match, db)
    
    db.refresh(match)
    db.refresh(vendor)

    # Emit match accepted by requester event
    try:
        emit_and_broadcast_sync(
            EventType.MATCH_ACCEPTED_BY_REQUESTER,
            {
                "requester_id": user.id,
                "vendor_id": vendor.id,
                "request_id": request_id,
                "match_id": match.id,
                "new_vendor_rating": round(new_rating, 2)
            }
        )
    except Exception as e:
        logger.error(f"Failed to emit match accepted event: {e}")

    return {
        "message": "Vendor accepted",
        "match_id": match.id,
        "vendor_id": vendor.id,
        "vendor_name": vendor.shop_name,
        "vendor_rating_updated": round(new_rating, 2),
    }

# ============ REQUEST STATS ============
@router.get("/stats")
def get_requester_stats(
    user: User = Depends(get_current_requester),
    db: Session = Depends(get_db)
):
    """Get summarized stats for the requester dashboard."""
    total = db.query(DBRequest).filter(DBRequest.user_id == user.id).count()
    active = db.query(DBRequest).filter(
        DBRequest.user_id == user.id,
        DBRequest.status.in_([RequestStatus.PENDING, RequestStatus.MATCHED, RequestStatus.ACCEPTED])
    ).count()
    resolved = db.query(DBRequest).filter(
        DBRequest.user_id == user.id,
        DBRequest.status == RequestStatus.COMPLETED
    ).count()

    return {
        "active_requests": active,
        "resolved_requests": resolved,
        "total_requests": total,
        "avg_match_time": "12m", # Placeholder until real tracking added
        "pending_response": active
    }

# ============ REQUEST HISTORY ============
@router.get("/my", response_model=List[RequestResponse])
def get_request_history(
    user: User = Depends(get_current_requester),
    db: Session = Depends(get_db)
):
    """Get all requests from current requester."""
    requests = (
        db.query(DBRequest)
        .filter(DBRequest.user_id == user.id)
        .order_by(DBRequest.created_at.desc())
        .all()
    )
    return requests

# ============ CANCEL REQUEST ============
@router.post("/{request_id}/cancel")
def cancel_request(
    request_id: int,
    user: User = Depends(get_current_requester),
    db: Session = Depends(get_db)
):
    """Cancel a pending request."""
    if request_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request_id",
        )

    request = db.query(DBRequest).filter(
        DBRequest.id == request_id,
        DBRequest.user_id == user.id
    ).first()
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    if request.status not in CANCELLABLE_REQUEST_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel request in {request.status.value} state",
        )

    # Get affected vendors before cancelling
    affected_matches = db.query(Match).filter(
        Match.request_id == request_id,
        Match.status.in_([MatchStatus.PENDING, MatchStatus.ACCEPTED_BY_VENDOR]),
    ).all()
    affected_vendor_ids = [m.vendor_id for m in affected_matches]

    db.query(Match).filter(
        Match.request_id == request_id,
        Match.status.in_([MatchStatus.PENDING, MatchStatus.ACCEPTED_BY_VENDOR]),
    ).update(
        {Match.status: MatchStatus.CANCELLED_BY_REQUESTER},
        synchronize_session=False,
    )

    request.status = RequestStatus.CANCELLED

    db.commit()
    db.refresh(request)

    # Emit match cancelled event for affected vendors
    if affected_vendor_ids:
        try:
            emit_and_broadcast_sync(
                EventType.MATCH_CANCELLED,
                {
                    "request_id": request_id,
                    "requester_id": user.id,
                    "affected_vendor_ids": affected_vendor_ids
                }
            )
        except Exception as e:
            logger.error(f"Failed to emit match cancelled event: {e}")

    return {"message": "Request cancelled"}


# ============ GET REQUEST DETAILS ============
@router.get("/{request_id}", response_model=RequestResponse)
def get_request_details(
    request_id: int,
    user: User = Depends(get_current_requester),
    db: Session = Depends(get_db)
):
    """Get details of a specific request."""
    request = db.query(DBRequest).filter(
        DBRequest.id == request_id, 
        DBRequest.user_id == user.id
    ).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    return request

# ============ DELETE REQUEST ============
@router.delete("/{request_id}")
def delete_request(
    request_id: int,
    user: User = Depends(get_current_requester),
    db: Session = Depends(get_db)
) :
    """Delete a request (only if pending or cancelled)."""
    request = db.query(DBRequest).filter(
        DBRequest.id == request_id, 
        DBRequest.user_id == user.id
    ).first()
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found or not owned by you")
    
    if request.status not in {RequestStatus.PENDING, RequestStatus.CANCELLED}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete request in {request.status.value} status"
        )
        
    db.delete(request)
    db.commit()
    return {"message": "Request deleted"}

