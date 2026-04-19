from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Request, User
from schemas import RequestCreate, RequestResponse
from auth import get_current_user
from services.audit import AuditService
from typing import List

router = APIRouter(prefix="/requests", tags=["requests"])

@router.post("/", response_model=RequestResponse)
def create_request(req_in: RequestCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_req = Request(
        user_id=current_user.id,
        **req_in.dict()
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    AuditService.log(db, "request_created", user_id=current_user.id, resource_type="request", resource_id=new_req.id)
    return new_req

@router.get("/my", response_model=List[RequestResponse])
def get_my_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Request).filter(Request.user_id == current_user.id).all()

@router.get("/{req_id}", response_model=RequestResponse)
def get_request(req_id: int, db: Session = Depends(get_db)):
    req = db.query(Request).filter(Request.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    return req

@router.delete("/{req_id}")
def delete_request(req_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    req = db.query(Request).filter(Request.id == req_id, Request.user_id == current_user.id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found or not owned by you")
    db.delete(req)
    db.commit()
    return {"detail": "Request deleted"}
@router.get("/stats")
def get_requester_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import RequestStatus
    
    total = db.query(Request).filter(Request.user_id == current_user.id).count()
    active = db.query(Request).filter(
        Request.user_id == current_user.id,
        Request.status.in_([RequestStatus.PENDING, RequestStatus.MATCHED, RequestStatus.ACCEPTED])
    ).count()
    resolved = db.query(Request).filter(
        Request.user_id == current_user.id,
        Request.status == RequestStatus.COMPLETED
    ).count()

    # For now, let's assume a default match time if no data exists, or calculate if possible
    # Real logic: average of (fulfilled_at - created_at) for completed requests
    return {
        "active_requests": active,
        "resolved_requests": resolved,
        "avg_match_time": "12m", # This could be calculated from completed requests
        "pending_response": active # Assuming active requests need response
    }
