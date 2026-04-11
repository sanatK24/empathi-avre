from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, Vendor, Request as DBRequest, UserRole, ScoringConfig, VendorStatus, Match, RequestStatus
from schemas import AdminStatsResponse, ScoringWeights, ScoringConfigResponse, VendorModerationResponse, RequestModerationResponse, ModerationStatsResponse, VendorVerificationRequest, RequestFlaggingRequest
from auth import verify_token
from ml_pipeline import ml_service
from ml_data_pipeline import AVREDatasetPipeline
from ml_modeling import benchmark_service
from datetime import datetime
from realtime import emit_and_broadcast
from events import EventType
import asyncio

router = APIRouter(prefix="/admin", tags=["Admin"])

def get_current_admin(token: dict = Depends(verify_token), db: Session = Depends(get_db)):
    """Get current admin user."""
    user_id = token.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user

# ============ STATS & ANALYTICS ============
@router.get("/stats", response_model=AdminStatsResponse)
def get_stats(user: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Get aggregate system statistics."""
    total_users = db.query(User).count()
    total_vendors = db.query(Vendor).count()
    total_requests = db.query(DBRequest).count()

    # Calculate average match score
    from models import Match
    matches = db.query(Match).all()
    avg_match_score = sum(m.score for m in matches) / len(matches) if matches else 0.0

    # Count completed requests
    from models import RequestStatus
    completed_requests = db.query(DBRequest).filter(
        DBRequest.status == RequestStatus.COMPLETED
    ).count()

    return AdminStatsResponse(
        total_users=total_users,
        total_vendors=total_vendors,
        total_requests=total_requests,
        avg_match_score=round(avg_match_score, 2),
        requests_completed=completed_requests
    )

# ============ MODERATION STATS ============
@router.get("/moderation/stats", response_model=ModerationStatsResponse)
def get_moderation_stats(user: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Get moderation dashboard statistics."""
    pending_vendors = db.query(Vendor).filter(Vendor.status == VendorStatus.PENDING).count()
    flagged_vendors = db.query(Vendor).filter(Vendor.flagged == True).count()
    flagged_requests = db.query(DBRequest).filter(DBRequest.flagged == True).count()
    rejected_vendors = db.query(Vendor).filter(Vendor.status == VendorStatus.REJECTED).count()
    
    return ModerationStatsResponse(
        pending_vendors=pending_vendors,
        flagged_vendors=flagged_vendors,
        flagged_requests=flagged_requests,
        rejected_vendors=rejected_vendors
    )

# ============ USER MANAGEMENT ============
@router.get("/users")
def list_all_users(user: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """List all registered users."""
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at
        }
        for u in users
    ]

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Remove a user account (deactivate)."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    db.delete(target_user)
    db.commit()
    return {"message": f"User {user_id} deleted"}

# ============ VENDOR MANAGEMENT ============
@router.get("/vendors")
def list_all_vendors(user: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """List all registered vendors."""
    vendors = db.query(Vendor).all()
    return [
        {
            "id": v.id,
            "user_id": v.user_id,
            "shop_name": v.shop_name,
            "category": v.category,
            "latitude": v.latitude,
            "longitude": v.longitude,
            "rating": v.rating,
            "is_active": v.is_active,
            "created_at": v.created_at
        }
        for v in vendors
    ]

@router.post("/vendors/{vendor_id}/deactivate")
def deactivate_vendor(
    vendor_id: int,
    reason: str = "Admin deactivation",
    user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Deactivate a vendor with audit trail (Option C)."""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")

    vendor.is_active = False
    vendor.deactivation_reason = reason
    vendor.deactivated_by = user.id
    vendor.deactivated_at = datetime.utcnow()
    db.commit()
    db.refresh(vendor)
    return {"message": f"Vendor {vendor_id} deactivated", "reason": reason}

@router.post("/vendors/{vendor_id}/activate")
def activate_vendor(
    vendor_id: int,
    user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Activate a vendor."""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    vendor.is_active = True
    db.commit()
    db.refresh(vendor)
    return {"message": f"Vendor {vendor_id} activated"}

# ============ REQUEST MANAGEMENT ============
@router.get("/requests")
def list_all_requests(user: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """List all requests in the system."""
    requests = db.query(DBRequest).all()
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "resource_name": r.resource_name,
            "quantity": r.quantity,
            "urgency": r.urgency,
            "status": r.status,
            "created_at": r.created_at
        }
        for r in requests
    ]

# ============ SCORING WEIGHTS (FR-406) - Fully Wired ============
@router.get("/scoring-weights", response_model=ScoringConfigResponse)
def get_scoring_weights(user: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Get current AVRE scoring weights from database."""
    config = db.query(ScoringConfig).order_by(ScoringConfig.updated_at.desc()).first()
    
    if not config:
        # Create default on first access
        config = ScoringConfig()
        db.add(config)
        db.commit()
        db.refresh(config)
    
    return config

@router.put("/scoring-weights", response_model=ScoringConfigResponse)
def update_scoring_weights(
    weights: ScoringWeights,
    user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update AVRE scoring weights (admin only, persisted to DB for FR-406)."""
    # Get or create config
    config = db.query(ScoringConfig).first()
    if not config:
        config = ScoringConfig()
    
    # Update all weights
    config.distance_weight = weights.distance_weight
    config.stock_weight = weights.stock_weight
    config.rating_weight = weights.rating_weight
    config.speed_weight = weights.speed_weight
    config.urgency_weight = weights.urgency_weight
    config.updated_by = user.id
    config.updated_at = datetime.utcnow()
    
    db.add(config)
    db.commit()
    db.refresh(config)
    
    return config

# ============ VENDOR MODERATION (Option B) ============
@router.get("/moderation/vendors/pending")
def list_pending_vendors(user: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """List vendors pending verification."""
    vendors = db.query(Vendor).filter(Vendor.status == VendorStatus.PENDING).all()
    return [
        {
            "id": v.id,
            "shop_name": v.shop_name,
            "rating": v.rating,
            "is_active": v.is_active,
            "created_at": v.created_at
        }
        for v in vendors
    ]

@router.post("/moderation/vendors/{vendor_id}/verify", response_model=VendorModerationResponse)
def verify_vendor(
    vendor_id: int,
    request: VendorVerificationRequest,
    user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Approve/verify a vendor (Option B)."""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    
    vendor.status = VendorStatus.VERIFIED
    vendor.verification_reason = request.reason or "Verified by admin"
    db.commit()
    db.refresh(vendor)
    
    # Emit vendor verified event
    asyncio.create_task(emit_and_broadcast(
        EventType.VENDOR_VERIFIED,
        {
            "vendor_id": vendor.id,
            "shop_name": vendor.shop_name,
            "verification_reason": vendor.verification_reason
        }
    ))
    
    return VendorModerationResponse(
        id=vendor.id,
        shop_name=vendor.shop_name,
        status=vendor.status.value,
        is_active=vendor.is_active,
        flagged=vendor.flagged,
        flag_reason=vendor.flag_reason,
        deactivation_reason=vendor.deactivation_reason,
        deactivated_at=vendor.deactivated_at
    )

@router.post("/moderation/vendors/{vendor_id}/reject", response_model=VendorModerationResponse)
def reject_vendor(
    vendor_id: int,
    request: VendorVerificationRequest,
    user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Reject a vendor registration (Option B)."""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    
    vendor.status = VendorStatus.REJECTED
    vendor.verification_reason = request.reason or "Rejected by admin"
    vendor.is_active = False  # Disable rejected vendors
    db.commit()
    db.refresh(vendor)
    
    # Emit vendor rejected event
    asyncio.create_task(emit_and_broadcast(
        EventType.VENDOR_REJECTED,
        {
            "vendor_id": vendor.id,
            "shop_name": vendor.shop_name,
            "rejection_reason": vendor.verification_reason
        }
    ))
    
    return VendorModerationResponse(
        id=vendor.id,
        shop_name=vendor.shop_name,
        status=vendor.status.value,
        is_active=vendor.is_active,
        flagged=vendor.flagged,
        flag_reason=vendor.flag_reason,
        deactivation_reason=vendor.deactivation_reason,
        deactivated_at=vendor.deactivated_at
    )

@router.post("/moderation/vendors/{vendor_id}/flag", response_model=VendorModerationResponse)
def flag_vendor(
    vendor_id: int,
    request: VendorVerificationRequest,
    user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Flag a vendor for review (suspicious activity, etc)."""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    
    vendor.flagged = True
    vendor.flag_reason = request.reason or "Flagged by admin"
    vendor.status = VendorStatus.FLAGGED
    db.commit()
    db.refresh(vendor)
    
    # Emit vendor flagged event
    asyncio.create_task(emit_and_broadcast(
        EventType.VENDOR_FLAGGED,
        {
            "vendor_id": vendor.id,
            "shop_name": vendor.shop_name,
            "flag_reason": vendor.flag_reason
        }
    ))
    
    return VendorModerationResponse(
        id=vendor.id,
        shop_name=vendor.shop_name,
        status=vendor.status.value,
        is_active=vendor.is_active,
        flagged=vendor.flagged,
        flag_reason=vendor.flag_reason,
        deactivation_reason=vendor.deactivation_reason,
        deactivated_at=vendor.deactivated_at
    )

@router.post("/moderation/vendors/{vendor_id}/unflag")
def unflag_vendor(
    vendor_id: int,
    user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Remove flag from vendor."""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    
    vendor.flagged = False
    vendor.flag_reason = None
    db.commit()
    
    return {"message": f"Vendor {vendor_id} unflagged"}

# ============ REQUEST MODERATION (Option B) ============
@router.get("/moderation/requests/flagged")
def list_flagged_requests(user: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """List auto-flagged/spam requests."""
    requests = db.query(DBRequest).filter(DBRequest.flagged == True).all()
    return [
        {
            "id": r.id,
            "resource_name": r.resource_name,
            "urgency": r.urgency.value,
            "status": r.status.value,
            "flag_reason": r.flag_reason,
            "created_at": r.created_at
        }
        for r in requests
    ]

@router.post("/moderation/requests/{request_id}/flag", response_model=RequestModerationResponse)
def flag_request(
    request_id: int,
    flag_req: RequestFlaggingRequest,
    user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Flag a request as spam/abuse."""
    request = db.query(DBRequest).filter(DBRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    
    request.flagged = True
    request.flag_reason = flag_req.reason
    db.commit()
    db.refresh(request)
    
    # Emit request flagged event
    asyncio.create_task(emit_and_broadcast(
        EventType.REQUEST_FLAGGED,
        {
            "request_id": request.id,
            "requester_id": request.user_id,
            "flag_reason": request.flag_reason
        }
    ))
    
    return RequestModerationResponse(
        id=request.id,
        resource_name=request.resource_name,
        quantity=request.quantity,
        urgency=request.urgency.value,
        status=request.status.value,
        flagged=request.flagged,
        flag_reason=request.flag_reason
    )

@router.post("/moderation/requests/{request_id}/unflag")
def unflag_request(
    request_id: int,
    user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Remove flag from request."""
    request = db.query(DBRequest).filter(DBRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    
    request.flagged = False
    request.flag_reason = None
    db.commit()
    
    return {"message": f"Request {request_id} unflagged"}
def get_ml_status(user: User = Depends(get_current_admin)):
    """Inspect the optional ML model state."""
    return ml_service.status()


@router.post("/ml/train")
def train_ml_model(user: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Train or retrain the optional ML model from labeled matches."""
    result = ml_service.train_from_db(db)
    return {
        "trained": result.trained,
        "samples_used": result.samples_used,
        "message": result.message,
        "model": ml_service.status(),
    }


@router.post("/ml/dataset/generate")
def generate_ml_dataset(
    user: User = Depends(get_current_admin),
    rows: int = 5000,
    vendors: int = 100,
    requests: int = 500,
):
    """Generate a synthetic AVRE dataset for ML experimentation."""
    pipeline = AVREDatasetPipeline()
    dataset = pipeline.generate_synthetic_dataset(num_rows=rows, num_vendors=vendors, num_requests=requests)
    output_path = pipeline.save_dataset(dataset)
    return {
        "rows": int(dataset.shape[0]),
        "columns": list(dataset.columns),
        "output_path": output_path,
    }


@router.post("/ml/dataset/preprocess")
def preprocess_ml_dataset(
    user: User = Depends(get_current_admin),
    rows: int = 5000,
    vendors: int = 100,
    requests: int = 500,
):
    """Generate and preprocess a synthetic AVRE dataset."""
    pipeline = AVREDatasetPipeline()
    dataset = pipeline.generate_synthetic_dataset(num_rows=rows, num_vendors=vendors, num_requests=requests)
    result = pipeline.preprocess_dataset(dataset)
    return {
        "rows": int(result.features.shape[0]),
        "feature_count": int(result.features.shape[1]),
        "feature_names": result.feature_names,
        "target_summary": {
            "min": float(result.target.min()) if len(result.target) else 0.0,
            "max": float(result.target.max()) if len(result.target) else 0.0,
            "mean": float(result.target.mean()) if len(result.target) else 0.0,
        },
        "sample_features": result.features.head(3).to_dict(orient="records"),
    }


@router.post("/ml/benchmark")
def benchmark_ml_models(
    user: User = Depends(get_current_admin),
    rows: int = 5000,
    vendors: int = 100,
    requests: int = 500,
    strategy: str = "holdout",
    cv_folds: int = 5,
    seed: int = 42,
):
    """Train, validate, and compare AVRE models with grouped splits."""
    report = benchmark_service.benchmark(
        rows=rows,
        vendors=vendors,
        requests=requests,
        strategy=strategy,
        cv_folds=cv_folds,
        seed=seed,
    )
    return report


@router.get("/ml/feature-importance")
def get_ml_feature_importance(user: User = Depends(get_current_admin)):
    """Return the latest feature importance summary and chart path."""
    return benchmark_service.last_feature_importance()
