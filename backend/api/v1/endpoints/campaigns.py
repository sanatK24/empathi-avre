from typing import List, Optional
from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models import User, Campaign, CampaignStatus
from schemas import CampaignResponse, CampaignCreate, CampaignUpdate, DonationResponse, DonationHistoryResponse, DonationWithDonorResponse, CampaignUpdateResponse, CampaignUpdateCreate, UpdateCommentCreate, UpdateCommentResponse, CampaignCategoryResponse

from api.deps import get_active_user
from services.campaign_service import CampaignService
from repositories.campaign_repo import campaign_repo
from repositories.donation_repo import donation_repo
from background_tasks import BackgroundTasks as BgTasks

router = APIRouter()

@router.post("", response_model=CampaignResponse)
def create_campaign(
    data: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    return CampaignService.create_campaign(db, current_user, data)

from pydantic import BaseModel
class CampaignAnalyzeRequest(BaseModel):
    title: str
    description: str
    goal_amount: Optional[float] = None
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None

@router.post("/analyze")
def analyze_campaign(
    data: CampaignAnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """
    AI-Powered Campaign Comprehensive Review:
    Generates suggestions, extracts values, and infers urgency.
    """
    from ml.hf_services import hf_services
    text_content = f"{data.title}. {data.description}"
    
    # Fetch historical campaigns for context
    historical_campaigns = db.query(Campaign).filter(Campaign.created_by == current_user.id).all()
    
    # Fetch taxonomy to help LLM accurately pick valid options
    from models import CampaignCategory
    taxonomy_db = db.query(CampaignCategory).all()
    valid_categories = []
    for c in taxonomy_db:
        subcats = ", ".join([s.name for s in c.subcategories])
        valid_categories.append(f"{c.name} (Subcategories: {subcats})")
    taxonomy_str = "\n".join(valid_categories)
    
    analysis = hf_services.analyze_campaign_comprehensive(text_content, historical_campaigns, taxonomy_str)
    
    # We map predicted categories back to IDs if needed, but for now we can just return strings
    # The frontend will match them to the category dropdown names.
    return analysis

@router.get("", response_model=List[CampaignResponse])
def list_campaigns(
    skip: int = 0,
    limit: int = 20,
    category: Optional[str] = None,
    city: Optional[str] = None,
    db: Session = Depends(get_db)
):
    # Return both ACTIVE and COMPLETED campaigns that have raised money
    query = db.query(Campaign).filter(
        (Campaign.status == CampaignStatus.ACTIVE) | (Campaign.status == CampaignStatus.COMPLETED)
    )

    if category:
        from models import CampaignCategory
        cat_obj = db.query(CampaignCategory).filter(CampaignCategory.name.ilike(category)).first()
        if cat_obj:
            query = query.filter(Campaign.category_id == cat_obj.id)
    if city:
        query = query.filter(Campaign.city == city)
    
    return query.order_by(Campaign.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/taxonomy", response_model=List[CampaignCategoryResponse])
def get_campaign_taxonomy(db: Session = Depends(get_db)):
    """
    Returns the full campaign taxonomy including subcategories and AI validation rules.
    """
    from models import CampaignCategory
    from sqlalchemy.orm import joinedload
    
    categories = db.query(CampaignCategory).options(
        joinedload(CampaignCategory.subcategories),
        joinedload(CampaignCategory.ai_rules)
    ).all()
    
    return categories

# ---- STATIC ROUTES MUST come BEFORE /{campaign_id} ----

from fastapi import UploadFile, File, HTTPException
import uuid

@router.post("/{campaign_id}/documents", response_model=CampaignResponse)
async def upload_campaign_document(
    campaign_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """
    Upload a verification document to Supabase and run AI OCR.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this campaign")

    # Read file bytes
    file_bytes = await file.read()
    
    # 1. Run AI OCR via HFServices
    from ml.hf_services import hf_services
    ocr_text = hf_services.extract_document_text(file_bytes)
    
    # 2. Upload to Supabase
    from services.storage_service import storage_service
    public_url = storage_service.upload_document(file_bytes, file.filename, file.content_type)
    
    # 3. Save to database
    campaign.verification_doc_url = public_url
    campaign.verification_ocr_text = ocr_text
    campaign.verified = True # Automatically mark verified for this prototype, or queue for review
    
    db.commit()
    db.refresh(campaign)
    
    return campaign

@router.get("/recommendations")
def get_recommendations(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """
    Get personalized campaign recommendations.
    Returns instantly while rebuilding recommendations in background.
    """
    # Return cached or quick recommendations
    recommendations = CampaignService.get_recommendations(db, current_user)

    # Rebuild recommendations in background for next time
    background_tasks.add_task(BgTasks.rebuild_user_recommendations, db, current_user.id)

    return recommendations

@router.get("/my", response_model=List[CampaignResponse])
def get_my_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    return campaign_repo.get_by_creator(db, current_user.id)

@router.get("/my-donations", response_model=List[DonationHistoryResponse])
def get_my_donations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    donations = donation_repo.get_user_donation_history(db, current_user.id)
    # Map campaign titles
    results = []
    for d in donations:
        res = DonationHistoryResponse.from_orm(d)
        res.campaign_title = d.campaign.title if d.campaign else "Unknown Campaign"
        results.append(res)
    return results

@router.get("/stats/categories")
def get_cat_stats(db: Session = Depends(get_db)):
    return campaign_repo.get_category_stats(db)

@router.get("/saved", response_model=List[CampaignResponse])
def get_saved_campaigns(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    from models import SavedCampaign
    saved_campaigns = db.query(Campaign).join(
        SavedCampaign, SavedCampaign.campaign_id == Campaign.id
    ).filter(
        SavedCampaign.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    return saved_campaigns


# ---- DYNAMIC ROUTES with /{campaign_id} ----

@router.get("/{campaign_id}", response_model=CampaignResponse)
def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

@router.put("/{campaign_id}", response_model=CampaignResponse)
def update_campaign(
    campaign_id: int,
    data: CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    from fastapi import HTTPException
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.created_by != current_user.id and current_user.role.upper() != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to edit this campaign")

    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(campaign, key, value)

    db.commit()
    db.refresh(campaign)
    return campaign
@router.put("/{campaign_id}/close", response_model=CampaignResponse)
def close_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    from fastapi import HTTPException
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.created_by != current_user.id and current_user.role.upper() != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to close this campaign")

    campaign.status = CampaignStatus.COMPLETED
    db.commit()
    db.refresh(campaign)
    return campaign

@router.delete("/{campaign_id}")
def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    from fastapi import HTTPException
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.created_by != current_user.id and current_user.role.upper() != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to delete this campaign")

    db.delete(campaign)
    db.commit()
    return {"message": "Campaign deleted successfully"}

@router.post("/{campaign_id}/donate", response_model=DonationResponse)
def donate(
    campaign_id: int,
    amount: float,
    anonymous: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    return CampaignService.add_donation(db, current_user, campaign_id, amount, anonymous)

@router.post("/{campaign_id}/save")
def save_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    from models import SavedCampaign
    from sqlalchemy.exc import IntegrityError
    from fastapi import HTTPException

    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Check if already saved
    existing = db.query(SavedCampaign).filter(
        SavedCampaign.user_id == current_user.id,
        SavedCampaign.campaign_id == campaign_id
    ).first()

    if existing:
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
def unsave_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    from models import SavedCampaign
    from fastapi import HTTPException

    saved = db.query(SavedCampaign).filter(
        SavedCampaign.user_id == current_user.id,
        SavedCampaign.campaign_id == campaign_id
    ).first()

    if not saved:
        raise HTTPException(status_code=404, detail="Campaign not saved")

    db.delete(saved)
    db.commit()
    return {"message": "Campaign unsaved successfully"}

@router.get("/{campaign_id}/donations", response_model=List[DonationWithDonorResponse])
def get_campaign_donations(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    return donation_repo.get_by_campaign(db, campaign_id)

@router.get("/{campaign_id}/stats")
def get_campaign_stats(
    campaign_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Get campaign statistics.
    Returns quick stats instantly while generating detailed analytics in background.
    """
    from models import Donation, DonationStatus
    from sqlalchemy import func

    # Get all completed donations for this campaign
    donations = db.query(Donation).filter(
        Donation.campaign_id == campaign_id,
        Donation.status == DonationStatus.COMPLETED
    ).all()

    total_amount = sum(d.amount for d in donations)
    total_count = len(donations)
    unique_donors = len(set(d.user_id for d in donations))
    avg_donation = total_amount / total_count if total_count > 0 else 0

    # Generate detailed analytics in background
    background_tasks.add_task(BgTasks.generate_campaign_analytics, db, campaign_id)

    return {
        "total_donations": total_count,
        "average_donation": avg_donation,
        "unique_donors": unique_donors,
        "total_raised": total_amount
    }

@router.get("/{campaign_id}/related", response_model=List[CampaignResponse])
def get_related_campaigns(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        return []
    return db.query(Campaign).filter(
        Campaign.category_id == campaign.category_id,
        Campaign.id != campaign_id,
        Campaign.status == CampaignStatus.ACTIVE
    ).limit(3).all()

@router.get("/{campaign_id}/updates", response_model=List[CampaignUpdateResponse])
def get_campaign_updates(
    campaign_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    from models import CampaignUpdate
    updates = db.query(CampaignUpdate).filter(CampaignUpdate.campaign_id == campaign_id).order_by(CampaignUpdate.created_at.desc()).all()
    
    results = []
    for update in updates:
        # Create a dict from the ORM object
        update_dict = {
            "id": update.id,
            "campaign_id": update.campaign_id,
            "created_by": update.created_by,
            "content": update.content,
            "image_url": update.image_url,
            "is_pinned": update.is_pinned,
            "created_at": update.created_at,
            "creator": update.creator,
            "comments_count": len(update.comments),
            "likes_count": len(update.likes),
            "is_liked_by_user": any(like.user_id == current_user.id for like in update.likes)
        }
        results.append(update_dict)
    return results

@router.post("/{campaign_id}/updates", response_model=CampaignUpdateResponse)
def create_campaign_update(
    campaign_id: int,
    data: CampaignUpdateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    from fastapi import HTTPException
    from models import CampaignUpdate

    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.created_by != current_user.id and current_user.role.upper() != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to post updates")
        
    update = CampaignUpdate(
        campaign_id=campaign_id,
        created_by=current_user.id,
        content=data.content,
        image_url=data.image_url
    )
    db.add(update)
    db.commit()
    db.refresh(update)
    return update

@router.delete("/{campaign_id}/updates/{update_id}")
def delete_campaign_update(
    campaign_id: int,
    update_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    from fastapi import HTTPException
    from models import CampaignUpdate

    update = db.query(CampaignUpdate).filter(
        CampaignUpdate.id == update_id,
        CampaignUpdate.campaign_id == campaign_id
    ).first()
    
    if not update:
        raise HTTPException(status_code=404, detail="Update not found")
        
    if update.created_by != current_user.id and current_user.role.upper() != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to delete this update")
        
    db.delete(update)
    db.commit()
    return {"message": "Update deleted successfully"}

@router.post("/{campaign_id}/updates/{update_id}/like")
def like_campaign_update(
    campaign_id: int,
    update_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    from fastapi import HTTPException
    from models import UpdateLike, CampaignUpdate
    
    update = db.query(CampaignUpdate).filter(CampaignUpdate.id == update_id).first()
    if not update:
        raise HTTPException(status_code=404, detail="Update not found")

    existing_like = db.query(UpdateLike).filter(
        UpdateLike.update_id == update_id,
        UpdateLike.user_id == current_user.id
    ).first()
    
    if not existing_like:
        new_like = UpdateLike(update_id=update_id, user_id=current_user.id)
        db.add(new_like)
        db.commit()
        
    return {"message": "Liked update"}

@router.post("/{campaign_id}/updates/{update_id}/unlike")
def unlike_campaign_update(
    campaign_id: int,
    update_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    from models import UpdateLike
    
    like = db.query(UpdateLike).filter(
        UpdateLike.update_id == update_id,
        UpdateLike.user_id == current_user.id
    ).first()
    
    if like:
        db.delete(like)
        db.commit()
        
    return {"message": "Unliked update"}

@router.put("/{campaign_id}/updates/{update_id}/pin")
def pin_campaign_update(
    campaign_id: int,
    update_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    from fastapi import HTTPException
    from models import CampaignUpdate

    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign or (campaign.created_by != current_user.id and current_user.role.upper() != "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    update = db.query(CampaignUpdate).filter(CampaignUpdate.id == update_id).first()
    if not update:
        raise HTTPException(status_code=404, detail="Update not found")
        
    update.is_pinned = not update.is_pinned
    db.commit()
    return {"message": "Pin status toggled", "is_pinned": update.is_pinned}

@router.get("/{campaign_id}/updates/{update_id}/comments", response_model=List[UpdateCommentResponse])
def get_update_comments(
    campaign_id: int,
    update_id: int,
    db: Session = Depends(get_db)
):
    from models import UpdateComment
    return db.query(UpdateComment).filter(UpdateComment.update_id == update_id).order_by(UpdateComment.created_at.asc()).all()

@router.post("/{campaign_id}/updates/{update_id}/comments", response_model=UpdateCommentResponse)
def add_update_comment(
    campaign_id: int,
    update_id: int,
    data: UpdateCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    from fastapi import HTTPException
    from models import UpdateComment, CampaignUpdate
    
    update = db.query(CampaignUpdate).filter(CampaignUpdate.id == update_id).first()
    if not update:
        raise HTTPException(status_code=404, detail="Update not found")
        
    comment = UpdateComment(
        update_id=update_id,
        user_id=current_user.id,
        text=data.text
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment

@router.delete("/{campaign_id}/updates/{update_id}/comments/{comment_id}")
def delete_update_comment(
    campaign_id: int,
    update_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    from fastapi import HTTPException
    from models import UpdateComment

    comment = db.query(UpdateComment).filter(UpdateComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
        
    if comment.user_id != current_user.id and current_user.role.upper() != "ADMIN":
        # Allow campaign creator to delete any comment
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign or campaign.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete comment")
            
    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted"}
