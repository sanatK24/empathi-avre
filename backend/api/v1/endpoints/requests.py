from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Campaign, CampaignStatus
from api.deps import get_active_user
router = APIRouter()
@router.get("/stats")
def get_requests_stats(db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    uc = db.query(Campaign).filter(Campaign.created_by == current_user.id).all()
    return {"total_requests": len(uc), "resolved_requests": sum(1 for c in uc if c.status == CampaignStatus.COMPLETED), "matched_creators": 0, "active_requests": sum(1 for c in uc if c.status == CampaignStatus.ACTIVE), "active_campaigns": db.query(Campaign).filter(Campaign.status == CampaignStatus.ACTIVE).count(), "emergency_requests": db.query(Campaign).filter(Campaign.status == CampaignStatus.ACTIVE, Campaign.raised_amount < Campaign.goal_amount * 0.2).count(), "recommendations_available": 3}
@router.get("/my")
def get_request_history(db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    return [{"id": c.id, "resource_name": c.title, "name": c.title, "status": "Completed" if c.status == CampaignStatus.COMPLETED else "Active", "created_at": c.created_at.isoformat() if c.created_at else None, "urgency_level": "High" if c.goal_amount > 100000 else "Medium"} for c in db.query(Campaign).filter(Campaign.created_by == current_user.id).all()]
@router.post("")
def create_request(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    raise HTTPException(status_code=400, detail="User requests flows are consolidated. Please use Create Campaign instead.")
@router.get("/{request_id}")
def get_request_details(request_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    c = db.query(Campaign).filter(Campaign.id == request_id).first()
    if not c: raise HTTPException(status_code=404, detail="Request not found")
    return {"id": c.id, "resource_name": c.title, "name": c.title, "status": "Completed" if c.status == CampaignStatus.COMPLETED else "Active", "created_at": c.created_at.isoformat() if c.created_at else None, "urgency_level": "High" if c.goal_amount > 100000 else "Medium", "description": c.description}
@router.get("/{request_id}/matches")
def get_request_matches(request_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    return []
@router.post("/{request_id}/accept/{creator_id}")
def accept_creator_for_request(request_id: int, creator_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    return {"status": "success", "message": "Flow consolidated to campaigns."}
@router.post("/{request_id}/cancel")
def cancel_request(request_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    c = db.query(Campaign).filter(Campaign.id == request_id).first()
    if not c: raise HTTPException(status_code=404, detail="Request not found")
    if c.created_by != current_user.id and current_user.role.upper() != "ADMIN": raise HTTPException(status_code=403, detail="Not authorized")
    c.status = CampaignStatus.COMPLETED
    db.commit()
    return {"status": "success", "message": "Campaign closed successfully."}
