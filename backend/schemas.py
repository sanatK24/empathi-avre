from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from models import UserRole, UrgencyLevel, RequestStatus, MatchStatus, VerificationStatus, CampaignStatus, DonationStatus

# ============ USER SCHEMAS ============
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: UserRole = UserRole.REQUESTER
    phone: Optional[str] = None
    city: Optional[str] = None
    organization_name: Optional[str] = None
    bio: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    organization_name: Optional[str] = None
    bio: Optional[str] = None
    password: Optional[str] = None


class UserResponse(UserBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

# ============ REQUEST SCHEMAS ============
class RequestCreate(BaseModel):
    resource_name: str = Field(..., min_length=2, max_length=100)
    category: str = Field(..., min_length=2, max_length=50)
    quantity: int = Field(..., gt=0)
    location_lat: float = Field(..., ge=-90, le=90)
    location_lng: float = Field(..., ge=-180, le=180)
    city: str = Field(..., min_length=2, max_length=100)
    urgency_level: UrgencyLevel = UrgencyLevel.MEDIUM
    preferred_eta: Optional[int] = None
    notes: Optional[str] = Field(None, max_length=500)
    special_instructions: Optional[str] = Field(None, max_length=500)
    payment_mode: str = "cod"

class RequestResponse(BaseModel):
    id: int
    user_id: int
    resource_name: str
    category: str
    quantity: int
    location_lat: float
    location_lng: float
    city: str
    urgency_level: UrgencyLevel
    preferred_eta: Optional[int]
    notes: Optional[str]
    special_instructions: Optional[str]
    status: RequestStatus
    requester_rating: float
    payment_mode: str
    fulfilled_at: Optional[datetime]
    created_at: datetime
    class Config:
        from_attributes = True

# ============ VENDOR SCHEMAS ============
class VendorProfileCreate(BaseModel):
    shop_name: str
    category: str
    lat: float
    lng: float
    city: str
    service_radius: float = 10.0
    opening_hours: Optional[str] = "09:00-21:00"
    avg_response_time: int = 15

class VendorResponse(BaseModel):
    id: int
    user_id: int
    shop_name: str
    category: str
    lat: float
    lng: float
    city: str
    rating: float
    reliability_score: float
    avg_response_time: int
    service_radius: float
    verification_status: VerificationStatus
    opening_hours: Optional[str]
    is_active: bool
    total_completed_orders: int
    created_at: datetime
    class Config:
        from_attributes = True

# ============ INVENTORY SCHEMAS ============
class InventoryCreate(BaseModel):
    resource_name: str = Field(..., min_length=2, max_length=100)
    category: str = Field(..., min_length=2, max_length=50)
    sku_code: Optional[str] = None
    brand_name: Optional[str] = None
    quantity: int = Field(..., ge=0)
    reorder_level: int = 10
    price: Optional[float] = Field(None, ge=0)
    expiry_date: Optional[datetime] = None

class InventoryUpdate(BaseModel):
    quantity: Optional[int] = None
    reserved_quantity: Optional[int] = None
    reorder_level: Optional[int] = None
    price: Optional[float] = None
    expiry_date: Optional[datetime] = None

class InventoryResponse(BaseModel):
    id: int
    vendor_id: int
    resource_name: str
    category: str
    sku_code: Optional[str]
    brand_name: Optional[str]
    quantity: int
    reserved_quantity: int
    reorder_level: int
    price: Optional[float]
    expiry_date: Optional[datetime]
    updated_at: datetime
    class Config:
        from_attributes = True

# ============ MATCHING SCHEMAS ============
class RankedVendor(BaseModel):
    rank: int
    vendor_id: int
    shop_name: str
    distance_km: float
    relevance_score: float
    ml_score: Optional[float] = None
    rule_score: Optional[float] = None
    explanation: str
    response_eta: Optional[int] = None

class MatchResponse(BaseModel):
    request_id: int
    ranked_vendors: List[RankedVendor]

# ============ ADMIN SCHEMAS ============
class ScoringWeightsUpdate(BaseModel):
    ml_weight: float
    urgency_weight: float
    fairness_weight: float
    stock_weight: float
    freshness_weight: float

class AdminStats(BaseModel):
    total_users: int
    total_vendors: int
    total_requests: int
    total_matches: int
    active_vendors: int
    unverified_vendors: int
    total_requesters: int
    avg_match_score: float
    system_alerts: int
    match_rate: float
    match_activity: List[Dict[str, Any]]
    category_distribution: List[Dict[str, Any]]

# ============ CAMPAIGN SCHEMAS ============
class CampaignCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=10, max_length=5000)
    category: str = Field(..., min_length=2, max_length=50)
    city: str = Field(..., min_length=2, max_length=100)
    goal_amount: float = Field(..., gt=0)
    urgency_level: UrgencyLevel = UrgencyLevel.MEDIUM
    cover_image: Optional[str] = None
    deadline: Optional[datetime] = None
    status: Optional[CampaignStatus] = CampaignStatus.ACTIVE

class CampaignUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    description: Optional[str] = Field(None, min_length=10, max_length=5000)
    category: Optional[str] = None
    city: Optional[str] = None
    goal_amount: Optional[float] = Field(None, gt=0)
    urgency_level: Optional[UrgencyLevel] = None
    cover_image: Optional[str] = None
    deadline: Optional[datetime] = None
    status: Optional[CampaignStatus] = None

class CampaignResponse(BaseModel):
    id: int
    created_by: int
    title: str
    description: str
    category: str
    city: str
    goal_amount: float
    raised_amount: float
    urgency_level: UrgencyLevel
    cover_image: Optional[str]
    status: CampaignStatus
    verified: bool
    deadline: Optional[datetime]
    created_at: datetime
    class Config:
        from_attributes = True

class CampaignDetailResponse(CampaignResponse):
    donations_count: int = 0
    donor_count: int = 0
    progress_percentage: float = 0.0

# ============ DONATION SCHEMAS ============
class DonationCreate(BaseModel):
    amount: float = Field(..., gt=0)
    anonymous: bool = False
    message: Optional[str] = Field(None, max_length=500)

class DonationResponse(BaseModel):
    id: int
    campaign_id: int
    user_id: int
    amount: float
    anonymous: bool
    message: Optional[str]
    status: DonationStatus
    created_at: datetime
    class Config:
        from_attributes = True

class DonationWithDonorResponse(DonationResponse):
    donor_name: Optional[str] = None
    donor_city: Optional[str] = None

# ============ CAMPAIGN UPDATE SCHEMAS ============
class CampaignUpdateCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=10, max_length=2000)

class CampaignUpdateResponse(BaseModel):
    id: int
    campaign_id: int
    title: str
    content: str
    created_at: datetime
    class Config:
        from_attributes = True

# ============ PAYMENT SCHEMAS ============
class DonorDetails(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class PaymentProcess(BaseModel):
    campaign_id: int
    amount: float = Field(..., gt=0)
    payment_method: str = Field(..., description="upi|card|wallet|bank")
    anonymous: bool = False
    message: Optional[str] = Field(None, max_length=500)
    donor_details: Optional[DonorDetails] = None
