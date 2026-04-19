from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from database import get_db
from models import Request, Match, MatchStatus, Vendor, UserRole
from schemas import MatchResponse
from services.avre_engine import AVREEngine
from services.audit import AuditService
from services.fairness import FairnessManager
from auth import get_current_user

router = APIRouter(prefix="/match", tags=["matching"])
engine = AVREEngine()

@router.get("/{request_id}", response_model=MatchResponse)
def get_matches(request_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    request = db.query(Request).filter(Request.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
        
    ranked_vendors = engine.match(db, request)
    
    # Audit match generation
    AuditService.log(
        db, 
        "match_generated", 
        user_id=current_user.id, 
        resource_type="request", 
        resource_id=request_id,
        details=f"Vendors found: {len(ranked_vendors)}"
    )
    
    return {
        "request_id": request_id,
        "ranked_vendors": ranked_vendors
    }

@router.post("/{request_id}/accept/{vendor_id}")
def accept_match(request_id: int, vendor_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    request = db.query(Request).filter(Request.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Create or update match
    match = db.query(Match).filter(Match.request_id == request_id, Match.vendor_id == vendor_id).first()
    if not match:
        match = Match(request_id=request_id, vendor_id=vendor_id, status=MatchStatus.ACCEPTED_BY_REQUESTER)
        db.add(match)
    else:
        match.status = MatchStatus.ACCEPTED_BY_REQUESTER
    
    # Update request status
    request.status = "matched"
    
    # Audit vendor accepted
    AuditService.log(
        db, 
        "vendor_accepted", 
        user_id=current_user.id, 
        resource_type="vendor", 
        resource_id=vendor_id,
        details=f"Request ID: {request_id}"
    )
    
    # Update fairness penalty (Novelty: Selected vendors get a penalty to give others a chance)
    FairnessManager.update_penalty(vendor, increment=0.2)
    
    db.commit()
    return {"message": "Vendor accepted successfully", "match_id": match.id}

@router.post("/{request_id}/complete")
def complete_request(request_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    request = db.query(Request).filter(Request.id == request_id, Request.user_id == current_user.id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found or unauthorized")
    
    request.status = "completed"
    
    # Find active match and mark as completed
    match = db.query(Match).filter(
        Match.request_id == request_id, 
        Match.status == MatchStatus.ACCEPTED_BY_REQUESTER
    ).first()
    
    if match:
        match.status = MatchStatus.COMPLETED
        # Update vendor stats
        vendor = db.query(Vendor).filter(Vendor.id == match.vendor_id).first()
        if vendor:
            vendor.total_completed_orders += 1

    db.commit()
    
    # Audit request completed
    AuditService.log(
        db, 
        "request_completed", 
        user_id=current_user.id, 
        resource_type="request", 
        resource_id=request_id
    )
    
    return {"message": "Request marked as completed"}
@router.get("/vendor", response_model=List[dict])
def get_vendor_matches(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    vendor = db.query(Vendor).filter(Vendor.user_id == current_user.id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor profile not found")
    
    # Get all matches for this vendor
    matches = db.query(Match).filter(Match.vendor_id == vendor.id).all()
    
    results = []
    for match in matches:
        req = db.query(Request).filter(Request.id == match.request_id).first()
        if req:
            requester = db.query(models.User).filter(models.User.id == req.user_id).first()
            
            # Simple Haversine or similar could be here, but for now we use what's in the engine if available
            # or just format what we have
            results.append({
                "id": f"REQ-{req.id}",
                "match_id": match.id,
                "request_id": req.id,
                "resource_name": req.resource_name,
                "quantity": f"{req.quantity} units",
                "requester_name": requester.name if requester else "Unknown",
                "urgency_level": req.urgency_level,
                "location": req.city or "Mumbai",
                "score": int(match.score) if match.score > 1 else int(match.score * 100),
                "status": match.status,
                "created_at": req.created_at.isoformat() if req.created_at else None
            })
    
    return results
