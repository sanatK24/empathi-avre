from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from models import UserRole, UrgencyLevel, RequestStatus, MatchStatus, VerificationStatus, CampaignStatus, DonationStatus

# Utility for case-insensitive Enums
def to_upper(v):
    if isinstance(v, str):
        return v.upper()
    return v

# ============ USER SCHEMAS ============
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: UserRole = UserRole.REQUESTER
    phone: Optional[str] = None
    city: Optional[str] = None
    organization_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool = True
    can_switch_role: bool = False
    blood_group: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    preferred_hospital: Optional[str] = None
    saved_addresses: Optional[str] = None
    accessibility_needs: Optional[str] = None
    personal_categories: Optional[str] = None

    @field_validator('role', mode='before')
    @classmethod
    def validate_role(cls, v):
        return to_upper(v)

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
    blood_group: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    preferred_hospital: Optional[str] = None
    saved_addresses: Optional[str] = None
    accessibility_needs: Optional[str] = None
    personal_categories: Optional[str] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class SocialAuthRequest(BaseModel):
    token: str
    provider: str
    role: Optional[UserRole] = UserRole.REQUESTER

    @field_validator('role', mode='before')
    @classmethod
    def validate_role(cls, v):
        return to_upper(v)

class UserEmergencyContactBase(BaseModel):
    name: str
    phone: str
    category: str

class UserEmergencyContactResponse(UserEmergencyContactBase):
    id: int
    class Config:
        from_attributes = True

class UserProfileResponse(UserResponse):
    emergency_contacts: List[UserEmergencyContactResponse] = []
    is_vendor: bool = False
    class Config:
        from_attributes = True

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

    @field_validator('urgency_level', mode='before')
    @classmethod
    def validate_urgency(cls, v):
        return to_upper(v)

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
    service_areas: Optional[str] = None
    registration_id: Optional[str] = None
    opening_hours: Optional[str] = "09:00-21:00"
    lead_time: Optional[str] = None
    avg_response_time: int = 15
    is_active: Optional[bool] = True

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
    service_areas: Optional[str]
    registration_id: Optional[str]
    lead_time: Optional[str]
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

    @field_validator('urgency_level', 'status', mode='before')
    @classmethod
    def validate_enums(cls, v):
        return to_upper(v)

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

    @field_validator('urgency_level', 'status', mode='before')
    @classmethod
    def validate_enums(cls, v):
        return to_upper(v)

class CampaignResponse(BaseModel):
    id: int
    created_by: int
    creator_name: Optional[str] = None
    creator_avatar: Optional[str] = None
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
    is_flagged: bool = False
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

class DonationHistoryResponse(DonationResponse):
    campaign_title: Optional[str] = None

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

# ============ ADMIN SCHEMAS ============
class CampaignVerifyRequest(BaseModel):
    verified: bool

class CampaignStatusUpdate(BaseModel):
    status: CampaignStatus

    @field_validator('status', mode='before')
    @classmethod
    def validate_status(cls, v):
        return to_upper(v)

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

# ============ EMERGENCY DIRECTORY SCHEMAS ============
class EmergencyContactResponse(BaseModel):
    id: int
    name: str
    phone: str
    category: str
    description: Optional[str]
    city: str
    is_pinned: bool
    class Config:
        from_attributes = True

class PublicFacilityResponse(BaseModel):
    id: int
    name: str
    facility_type: str
    address: str
    city: str
    phone: Optional[str]
    lat: float
    lng: float
    is_verified: bool
    operating_hours: str
    rating: float
    distance_km: Optional[float] = None
    class Config:
        from_attributes = True
