from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models import User
from api.deps import get_active_user
from services.emergency_service import EmergencyService
from schemas import RequestCreate, RequestResponse, EmergencyContactResponse, PublicFacilityResponse

router = APIRouter()

@router.get("/active")
def get_active_emergencies(
    db: Session = Depends(get_db)
):
    """Public view of active critical needs."""
    return EmergencyService.get_dashboard_data(db)

@router.post("/request", response_model=RequestResponse)
def report_emergency(
    data: RequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """Create a high-priority emergency request with instant matching."""
    return EmergencyService.create_emergency_request(db, current_user, data)

@router.get("/helplines", response_model=List[EmergencyContactResponse])
def get_helplines(
    city: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch structured emergency helpline directory."""
    return EmergencyService.get_helplines(db, city)

@router.get("/facilities", response_model=List[PublicFacilityResponse])
def get_facilities(
    city: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Search for nearby hospitals, clinics, and trauma centers."""
    return EmergencyService.search_nearby_facilities(db, city, lat, lng, type)
