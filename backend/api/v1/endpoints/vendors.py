from typing import List, Any, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, Vendor
from schemas import VendorProfileCreate, VendorResponse
from api.deps import get_active_user
from services.vendor_service import VendorService
from repositories.vendor_repo import vendor_repo
from core.exceptions import NotFoundException

router = APIRouter()

@router.post("/profile", response_model=VendorResponse)
def create_or_update_profile(
    data: VendorProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    return VendorService.get_or_create_profile(db, current_user, data)

@router.get("/profile", response_model=VendorResponse)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    vendor = vendor_repo.get_by_user_id(db, current_user.id)
    if not vendor:
        raise NotFoundException("Vendor profile")
    return vendor

@router.get("/stats")
def get_vendor_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    vendor = vendor_repo.get_by_user_id(db, current_user.id)
    if not vendor:
        raise NotFoundException("Vendor profile")
    return VendorService.get_stats(db, vendor)

@router.get("/analytics")
def get_vendor_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    # This logic was quite large in legacy, keeping a placeholder for service call
    # In a full refactor, this moves to a dedicated AnalyticsService
    from routes.vendor_routes import get_vendor_analytics as legacy_analytics
    return legacy_analytics(db, current_user)
