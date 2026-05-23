from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import User, Follow, Campaign, CampaignStatus
from schemas import PublicUserProfileResponse, UserFollowerResponse, FollowResponse
from api.deps import get_active_user
from sqlalchemy.exc import IntegrityError

router = APIRouter()

@router.get("/{user_id}/profile", response_model=PublicUserProfileResponse)
def get_public_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """Get public profile of a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if current user follows this user
    is_following = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user_id
    ).first() is not None

    # Count followers
    follower_count = db.query(func.count(Follow.id)).filter(
        Follow.following_id == user_id
    ).scalar() or 0

    # Count following
    following_count = db.query(func.count(Follow.id)).filter(
        Follow.follower_id == user_id
    ).scalar() or 0

    # Count campaigns
    campaigns_created_count = db.query(func.count(Campaign.id)).filter(
        Campaign.created_by == user_id,
        Campaign.status == CampaignStatus.ACTIVE
    ).scalar() or 0

    return PublicUserProfileResponse(
        id=user.id,
        name=user.name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        city=user.city,
        organization_name=user.organization_name,
        follower_count=follower_count,
        following_count=following_count,
        campaigns_created_count=campaigns_created_count,
        is_following=is_following
    )

@router.post("/{user_id}/follow", response_model=FollowResponse)
def follow_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """Follow a user"""
    # Check if target user exists
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Cannot follow self
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    # Check if already following
    existing_follow = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user_id
    ).first()

    if existing_follow:
        raise HTTPException(status_code=400, detail="Already following this user")

    # Create follow relationship
    try:
        follow = Follow(follower_id=current_user.id, following_id=user_id)
        db.add(follow)
        db.commit()
        db.refresh(follow)
        return follow
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Could not create follow relationship")

@router.delete("/{user_id}/follow")
def unfollow_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """Unfollow a user"""
    follow = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user_id
    ).first()

    if not follow:
        raise HTTPException(status_code=404, detail="Not following this user")

    db.delete(follow)
    db.commit()
    return {"message": "Unfollowed successfully"}

@router.get("/{user_id}/followers", response_model=List[UserFollowerResponse])
def get_user_followers(
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """Get list of followers for a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get followers
    followers = db.query(User).join(
        Follow, Follow.follower_id == User.id
    ).filter(
        Follow.following_id == user_id
    ).offset(skip).limit(limit).all()

    return followers

@router.get("/{user_id}/following", response_model=List[UserFollowerResponse])
def get_user_following(
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """Get list of users that this user is following"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get following
    following = db.query(User).join(
        Follow, Follow.following_id == User.id
    ).filter(
        Follow.follower_id == user_id
    ).offset(skip).limit(limit).all()

    return following

@router.get("/{user_id}/campaigns", response_model=List)
def get_user_campaigns(
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """Get all active campaigns created by a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    campaigns = db.query(Campaign).filter(
        Campaign.created_by == user_id,
        Campaign.status == CampaignStatus.ACTIVE
    ).offset(skip).limit(limit).all()

    return campaigns

@router.get("/me/timeline")
def get_user_timeline(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    from models import Donation, UpdateLike, UpdateComment, Campaign
    
    timeline = []
    
    donations = db.query(Donation).filter(Donation.user_id == current_user.id).all()
    for d in donations:
        timeline.append({
            "id": f"don_{d.id}",
            "type": "donation",
            "action": f"Donated ₹{d.amount}",
            "target": d.campaign.title if d.campaign else "a campaign",
            "campaign_id": d.campaign_id,
            "created_at": d.created_at
        })
        
    likes = db.query(UpdateLike).filter(UpdateLike.user_id == current_user.id).all()
    for l in likes:
        timeline.append({
            "id": f"like_{l.id}",
            "type": "like",
            "action": "Liked an update on",
            "target": l.update.campaign.title if l.update and l.update.campaign else "a campaign",
            "campaign_id": l.update.campaign_id if l.update else None,
            "created_at": l.created_at
        })
        
    comments = db.query(UpdateComment).filter(UpdateComment.user_id == current_user.id).all()
    for c in comments:
        timeline.append({
            "id": f"comment_{c.id}",
            "type": "comment",
            "action": f"Commented '{c.text[:30]}{'...' if len(c.text) > 30 else ''}' on",
            "target": c.update.campaign.title if c.update and c.update.campaign else "a campaign",
            "campaign_id": c.update.campaign_id if c.update else None,
            "created_at": c.created_at
        })

    campaigns = db.query(Campaign).filter(Campaign.created_by == current_user.id).all()
    for c in campaigns:
        timeline.append({
            "id": f"camp_{c.id}",
            "type": "campaign_created",
            "action": "Created campaign",
            "target": c.title,
            "campaign_id": c.id,
            "created_at": c.created_at
        })
        
    timeline.sort(key=lambda x: x["created_at"], reverse=True)
    return timeline
