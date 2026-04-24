from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, Vendor, Match, MatchStatus
from api.deps import get_active_user
from repositories.match_repo import match_repo
from core.exceptions import NotFoundException

router = APIRouter()

@router.get("/incoming", response_model=List[dict])
def get_incoming_matches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """View matches sent to the current vendor."""
    vendor = db.query(Vendor).filter(Vendor.user_id == current_user.id).first()
    if not vendor:
        raise NotFoundException("Vendor profile")
    
    matches = db.query(Match).filter(Match.vendor_id == vendor.id).all()
    
    results = []
    for match in matches:
        req = match.request
        results.append({
            "match_id": match.id,
            "request_id": req.id,
            "resource_name": req.resource_name,
            "quantity": req.quantity,
            "urgency": req.urgency_level.value,
            "location": req.city or "Unknown",
            "score": round(match.score, 2),
            "status": match.status.value,
            "created_at": req.created_at.isoformat() if req.created_at else None
        })
    
    return results

@router.post("/{match_id}/vendor-accept")
def vendor_accept_match(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """Vendor accepts the match offer."""
    match = match_repo.get(db, match_id)
    if not match:
        raise NotFoundException("Match")
        
    vendor = db.query(Vendor).filter(Vendor.user_id == current_user.id).first()
    if not vendor or match.vendor_id != vendor.id:
        raise NotFoundException("Assigned match")
        
    match.status = MatchStatus.ACCEPTED_BY_VENDOR
    db.commit()
    
    # No notification side-effect for now
    pass
    
    return {"message": "Match accepted by vendor"}
