from typing import List, Optional; from fastapi import APIRouter, Depends, HTTPException, Body, BackgroundTasks; from sqlalchemy.orm import Session; from database import get_db; from models import User, UserRole, Campaign; from api.deps import get_current_admin; from services.admin_service import AdminService; from schemas import AdminStats, CampaignVerifyRequest; from background_tasks import BackgroundTasks as BgTasks
router = APIRouter()
@router.get("/stats", response_model=AdminStats)
def get_stats(background_tasks: BackgroundTasks, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    stats = AdminService.get_system_stats(db)
    background_tasks.add_task(BgTasks.generate_admin_statistics, db)
    return stats
@router.get("/users")
def list_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    result = []
    for u in db.query(User).order_by(User.id.desc()).offset(skip).limit(limit).all():
        activities, seen_actions = [], set()
        for log in u.audit_logs: seen_actions.add((log.action, log.resource_type, log.resource_id)); activities.append({"id": f"a_{log.id}", "action": log.action, "resource_type": log.resource_type, "timestamp": log.timestamp.isoformat() if log.timestamp else "", "details": log.details})
        for c in u.campaigns:
            if ("create_campaign", "campaign", c.id) not in seen_actions: seen_actions.add(("create_campaign", "campaign", c.id)); activities.append({"id": f"c_{c.id}", "action": "create_campaign", "resource_type": "campaign", "timestamp": c.created_at.isoformat() if c.created_at else "", "details": f"Created campaign: {c.title}."})
        for d in u.donations:
            if ("donate", "donation", d.id) not in seen_actions: seen_actions.add(("donate", "donation", d.id)); activities.append({"id": f"d_{d.id}", "action": "donate", "resource_type": "donation", "timestamp": d.created_at.isoformat() if d.created_at else "", "details": f"Donated ₹{d.amount} to campaign: {d.campaign.title if d.campaign else f'Campaign ID {d.campaign_id}'}."})
        activities.sort(key=lambda x: x["timestamp"] or "", reverse=True)
        result.append({"id": u.id, "name": u.name, "email": u.email, "role": u.role.value if u.role else "USER", "is_active": u.is_active, "audit_logs": activities})
    return result
@router.get("/campaigns")
def list_campaigns(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return [{"id": c.id, "title": c.title, "description": c.description, "city": c.city, "goal_amount": c.goal_amount, "raised_amount": c.raised_amount, "cover_image": c.cover_image, "status": c.status.value if c.status else "DRAFT", "verified": c.verified, "deadline": c.deadline.isoformat() if c.deadline else None, "is_flagged": c.is_flagged, "created_at": c.created_at.isoformat() if c.created_at else None, "category_id": c.category_id, "subcategory_id": c.subcategory_id, "category": c.taxonomy_category.name if c.taxonomy_category else "General", "creator": {"id": c.creator.id, "name": c.creator.name, "email": c.creator.email, "avatar_url": c.creator.avatar_url} if c.creator else None} for c in db.query(Campaign).order_by(Campaign.id.desc()).offset(skip).limit(limit).all()]
@router.put("/campaigns/{campaign_id}/verify")
def verify_campaign(campaign_id: int, verified: bool = True, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    res = AdminService.verify_campaign(db, admin, campaign_id, verified)
    if not res: raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Success", "verified": res.verified}
@router.put("/campaigns/{campaign_id}/flag")
def flag_campaign(campaign_id: int, flagged: bool = True, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    res = AdminService.flag_campaign(db, admin, campaign_id, flagged)
    if not res: raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Success", "is_flagged": res.is_flagged}
@router.delete("/campaigns/{campaign_id}")
def delete_campaign(campaign_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    if not AdminService.delete_campaign(db, admin, campaign_id): raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Campaign deleted successfully"}
