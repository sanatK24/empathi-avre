from typing import List, Optional
from fastapi import APIRouter, Depends, BackgroundTasks, UploadFile, File, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from database import get_db, SessionLocal
from models import User, Campaign, CampaignStatus, CampaignCategory, SavedCampaign, Donation, DonationStatus, CampaignUpdate, UpdateLike, UpdateComment
from schemas import CampaignResponse, CampaignCreate, CampaignUpdate, DonationResponse, DonationHistoryResponse, DonationWithDonorResponse, CampaignUpdateResponse, CampaignUpdateCreate, UpdateCommentCreate, UpdateCommentResponse, CampaignCategoryResponse
from api.deps import get_active_user
from services.campaign_service import CampaignService
from repositories.campaign_repo import campaign_repo
from repositories.donation_repo import donation_repo
from background_tasks import BackgroundTasks as BgTasks
from ml.hf_services import hf_services
from services.storage_service import storage_service

router = APIRouter()

@router.post("", response_model=CampaignResponse)
def create_campaign(data: CampaignCreate, db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    return CampaignService.create_campaign(db, current_user, data)

class CampaignAnalyzeRequest(BaseModel):
    title: str
    description: str
    goal_amount: Optional[float] = None
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None

@router.post("/analyze")
def analyze_campaign(data: CampaignAnalyzeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    text_content = f"{data.title}. {data.description}"
    historical_campaigns = db.query(Campaign).filter(Campaign.created_by == current_user.id).all()
    taxonomy_str = "\n".join(f"{c.name} (Subcategories: {', '.join(s.name for s in c.subcategories)})" for c in db.query(CampaignCategory).all())
    return hf_services.analyze_campaign_comprehensive(text_content, historical_campaigns, taxonomy_str)

class DescriptionRefineRequest(BaseModel):
    description: str

@router.post("/refine-description")
def refine_description(data: DescriptionRefineRequest, current_user: User = Depends(get_active_user)):
    return {"refined_description": hf_services.refine_campaign_description(data.description)}

@router.get("", response_model=List[CampaignResponse])
def list_campaigns(skip: int = 0, limit: int = 20, category: Optional[str] = None, city: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Campaign).filter((Campaign.status == CampaignStatus.ACTIVE) | (Campaign.status == CampaignStatus.COMPLETED))
    if category:
        cat_obj = db.query(CampaignCategory).filter(CampaignCategory.name.ilike(category)).first()
        if cat_obj: query = query.filter(Campaign.category_id == cat_obj.id)
    if city: query = query.filter(Campaign.city == city)
    return query.order_by(Campaign.created_at.desc()).offset(skip).limit(limit).all()

@router.get("/taxonomy", response_model=List[CampaignCategoryResponse])
def get_campaign_taxonomy(db: Session = Depends(get_db)):
    return db.query(CampaignCategory).options(joinedload(CampaignCategory.subcategories), joinedload(CampaignCategory.ai_rules)).all()

def process_document_background(campaign_id: int, file_bytes: bytes, filename: str, content_type: str):
    db = SessionLocal()
    try:
        public_url = storage_service.upload_document(file_bytes, filename, content_type)
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if campaign:
            campaign.verification_doc_url = public_url
            campaign.verified = True
            db.commit()
    except Exception as e:
        print(f"Background document processing failed: {e}")
    finally:
        db.close()

@router.post("/{campaign_id}/documents", response_model=CampaignResponse)
async def upload_campaign_document(campaign_id: int, background_tasks: BackgroundTasks, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign: raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.created_by != current_user.id: raise HTTPException(status_code=403, detail="Not authorized to modify this campaign")
    background_tasks.add_task(process_document_background, campaign_id, await file.read(), file.filename, file.content_type)
    return campaign

@router.get("/recommendations")
def get_recommendations(background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    recommendations = CampaignService.get_recommendations(db, current_user)
    background_tasks.add_task(BgTasks.rebuild_user_recommendations, db, current_user.id)
    return recommendations

@router.get("/my", response_model=List[CampaignResponse])
def get_my_campaigns(db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    return campaign_repo.get_by_creator(db, current_user.id)

@router.get("/my-donations", response_model=List[DonationHistoryResponse])
def get_my_donations(db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    results = []
    for d in donation_repo.get_user_donation_history(db, current_user.id):
        res = DonationHistoryResponse.from_orm(d)
        res.campaign_title = d.campaign.title if d.campaign else "Unknown Campaign"
        results.append(res)
    return results

@router.get("/stats/categories")
def get_cat_stats(db: Session = Depends(get_db)):
    return campaign_repo.get_category_stats(db)

@router.get("/saved", response_model=List[CampaignResponse])
def get_saved_campaigns(skip: int = 0, limit: int = 20, db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    return db.query(Campaign).join(SavedCampaign, SavedCampaign.campaign_id == Campaign.id).filter(SavedCampaign.user_id == current_user.id).offset(skip).limit(limit).all()

@router.get("/{campaign_id}", response_model=CampaignResponse)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign: raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

@router.put("/{campaign_id}", response_model=CampaignResponse)
def update_campaign(campaign_id: int, data: CampaignUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign: raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.created_by != current_user.id and current_user.role.upper() != "ADMIN": raise HTTPException(status_code=403, detail="Not authorized to edit this campaign")
    for key, value in data.dict(exclude_unset=True).items(): setattr(campaign, key, value)
    db.commit()
    db.refresh(campaign)
    return campaign

@router.put("/{campaign_id}/close", response_model=CampaignResponse)
def close_campaign(campaign_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign: raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.created_by != current_user.id and current_user.role.upper() != "ADMIN": raise HTTPException(status_code=403, detail="Not authorized to close this campaign")
    campaign.status = CampaignStatus.COMPLETED
    db.commit()
    db.refresh(campaign)
    return campaign

@router.delete("/{campaign_id}")
def delete_campaign(campaign_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign: raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.created_by != current_user.id and current_user.role.upper() != "ADMIN": raise HTTPException(status_code=403, detail="Not authorized to delete this campaign")
    db.delete(campaign)
    db.commit()
    return {"message": "Campaign deleted successfully"}

@router.post("/{campaign_id}/donate", response_model=DonationResponse)
def donate(campaign_id: int, amount: float, anonymous: bool = False, db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    return CampaignService.add_donation(db, current_user, campaign_id, amount, anonymous)

@router.post("/{campaign_id}/save")
def save_campaign(campaign_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign: raise HTTPException(status_code=404, detail="Campaign not found")
    if db.query(SavedCampaign).filter(SavedCampaign.user_id == current_user.id, SavedCampaign.campaign_id == campaign_id).first():
        raise HTTPException(status_code=400, detail="Campaign already saved")
    try:
        saved = SavedCampaign(user_id=current_user.id, campaign_id=campaign_id)
        db.add(saved)
        db.commit()
        db.refresh(saved)
        return {"message": "Campaign saved successfully", "saved_campaign_id": saved.id}
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Could not save campaign")

@router.delete("/{campaign_id}/save")
def unsave_campaign(campaign_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    saved = db.query(SavedCampaign).filter(SavedCampaign.user_id == current_user.id, SavedCampaign.campaign_id == campaign_id).first()
    if not saved: raise HTTPException(status_code=404, detail="Campaign not saved")
    db.delete(saved)
    db.commit()
    return {"message": "Campaign unsaved successfully"}

@router.get("/{campaign_id}/donations", response_model=List[DonationWithDonorResponse])
def get_campaign_donations(campaign_id: int, db: Session = Depends(get_db)):
    return donation_repo.get_by_campaign(db, campaign_id)

@router.get("/{campaign_id}/stats")
def get_campaign_stats(campaign_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    donations = db.query(Donation).filter(Donation.campaign_id == campaign_id, Donation.status == DonationStatus.COMPLETED).all()
    total_amount = sum(d.amount for d in donations)
    total_count = len(donations)
    background_tasks.add_task(BgTasks.generate_campaign_analytics, db, campaign_id)
    return {
        "total_donations": total_count,
        "average_donation": total_amount / total_count if total_count > 0 else 0,
        "unique_donors": len(set(d.user_id for d in donations)),
        "total_raised": total_amount
    }

@router.get("/{campaign_id}/related", response_model=List[CampaignResponse])
def get_related_campaigns(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign: return []
    return db.query(Campaign).filter(Campaign.category_id == campaign.category_id, Campaign.id != campaign_id, Campaign.status == CampaignStatus.ACTIVE).limit(3).all()

@router.get("/{campaign_id}/updates", response_model=List[CampaignUpdateResponse])
def get_campaign_updates(campaign_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    updates = db.query(CampaignUpdate).filter(CampaignUpdate.campaign_id == campaign_id).order_by(CampaignUpdate.created_at.desc()).all()
    return [{
        "id": u.id, "campaign_id": u.campaign_id, "created_by": u.created_by, "content": u.content, "image_url": u.image_url,
        "is_pinned": u.is_pinned, "created_at": u.created_at, "creator": u.creator, "comments_count": len(u.comments),
        "likes_count": len(u.likes), "is_liked_by_user": any(l.user_id == current_user.id for l in u.likes)
    } for u in updates]

@router.post("/{campaign_id}/updates", response_model=CampaignUpdateResponse)
def create_campaign_update(campaign_id: int, data: CampaignUpdateCreate, db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign: raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.created_by != current_user.id and current_user.role.upper() != "ADMIN": raise HTTPException(status_code=403, detail="Not authorized to post updates")
    update = CampaignUpdate(campaign_id=campaign_id, created_by=current_user.id, content=data.content, image_url=data.image_url)
    db.add(update)
    db.commit()
    db.refresh(update)
    return update

@router.delete("/{campaign_id}/updates/{update_id}")
def delete_campaign_update(campaign_id: int, update_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    update = db.query(CampaignUpdate).filter(CampaignUpdate.id == update_id, CampaignUpdate.campaign_id == campaign_id).first()
    if not update: raise HTTPException(status_code=404, detail="Update not found")
    if update.created_by != current_user.id and current_user.role.upper() != "ADMIN": raise HTTPException(status_code=403, detail="Not authorized to delete this update")
    db.delete(update)
    db.commit()
    return {"message": "Update deleted successfully"}

@router.post("/{campaign_id}/updates/{update_id}/like")
def like_campaign_update(campaign_id: int, update_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    if not db.query(CampaignUpdate).filter(CampaignUpdate.id == update_id).first(): raise HTTPException(status_code=404, detail="Update not found")
    if not db.query(UpdateLike).filter(UpdateLike.update_id == update_id, UpdateLike.user_id == current_user.id).first():
        db.add(UpdateLike(update_id=update_id, user_id=current_user.id))
        db.commit()
    return {"message": "Liked update"}

@router.post("/{campaign_id}/updates/{update_id}/unlike")
def unlike_campaign_update(campaign_id: int, update_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    like = db.query(UpdateLike).filter(UpdateLike.update_id == update_id, UpdateLike.user_id == current_user.id).first()
    if like:
        db.delete(like)
        db.commit()
    return {"message": "Unliked update"}

@router.put("/{campaign_id}/updates/{update_id}/pin")
def pin_campaign_update(campaign_id: int, update_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign or (campaign.created_by != current_user.id and current_user.role.upper() != "ADMIN"): raise HTTPException(status_code=403, detail="Not authorized")
    update = db.query(CampaignUpdate).filter(CampaignUpdate.id == update_id).first()
    if not update: raise HTTPException(status_code=404, detail="Update not found")
    update.is_pinned = not update.is_pinned
    db.commit()
    return {"message": "Pin status toggled", "is_pinned": update.is_pinned}

@router.get("/{campaign_id}/updates/{update_id}/comments", response_model=List[UpdateCommentResponse])
def get_update_comments(campaign_id: int, update_id: int, db: Session = Depends(get_db)):
    return db.query(UpdateComment).filter(UpdateComment.update_id == update_id).order_by(UpdateComment.created_at.asc()).all()

@router.post("/{campaign_id}/updates/{update_id}/comments", response_model=UpdateCommentResponse)
def add_update_comment(campaign_id: int, update_id: int, data: UpdateCommentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    if not db.query(CampaignUpdate).filter(CampaignUpdate.id == update_id).first(): raise HTTPException(status_code=404, detail="Update not found")
    comment = UpdateComment(update_id=update_id, user_id=current_user.id, text=data.text)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment

@router.delete("/{campaign_id}/updates/{update_id}/comments/{comment_id}")
def delete_update_comment(campaign_id: int, update_id: int, comment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_active_user)):
    comment = db.query(UpdateComment).filter(UpdateComment.id == comment_id).first()
    if not comment: raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id and current_user.role.upper() != "ADMIN":
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign or campaign.created_by != current_user.id: raise HTTPException(status_code=403, detail="Not authorized to delete comment")
    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted"}
