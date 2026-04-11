from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from models import UserRole, UrgencyLevel, RequestStatus, MatchStatus

# ============ USER SCHEMAS ============
class UserRegister(BaseModel):
    code: str

class UserLogin(BaseModel):
    code: str

class UserRoleUpdate(BaseModel):
    role: UserRole

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True

# ============ VENDOR SCHEMAS ============
class VendorCreate(BaseModel):
    shop_name: str
    category: str
    latitude: float
    longitude: float
    avg_response_time: int = 15

class VendorUpdate(BaseModel):
    shop_name: Optional[str] = None
    is_active: Optional[bool] = None
    avg_response_time: Optional[int] = None

class VendorResponse(BaseModel):
    id: int
    user_id: int
    shop_name: str
    category: str
    latitude: float
    longitude: float
    rating: float
    avg_response_time: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ============ INVENTORY SCHEMAS ============
class InventoryCreate(BaseModel):
    resource_name: str
    quantity: int
    price: Optional[float] = None

class InventoryUpdate(BaseModel):
    quantity: Optional[int] = None
    price: Optional[float] = None

class InventoryResponse(BaseModel):
    id: int
    vendor_id: int
    resource_name: str
    quantity: int
    price: Optional[float]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ============ REQUEST SCHEMAS ============
class RequestCreate(BaseModel):
    resource_name: str
    quantity: int = Field(..., gt=0)
    latitude: float
    longitude: float
    urgency: UrgencyLevel = UrgencyLevel.MEDIUM
    notes: Optional[str] = None

class RequestResponse(BaseModel):
    id: int
    user_id: int
    resource_name: str
    quantity: int
    latitude: float
    longitude: float
    urgency: UrgencyLevel
    status: RequestStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ============ MATCH SCHEMAS ============
class MatchDetail(BaseModel):
    id: int
    vendor_id: int
    score: float
    distance_score: float
    stock_score: float
    rating_score: float
    speed_score: float
    urgency_score: float
    status: MatchStatus

class MatchResultWithVendor(BaseModel):
    rank: int
    match_id: int
    match_status: MatchStatus
    is_selectable: bool
    vendor_id: int
    vendor_name: str
    category: str
    distance: float  # km
    eta: int  # minutes
    score: float
    rating: float

class MatchResponse(BaseModel):
    id: int
    request_id: int
    vendor_id: int
    score: float
    status: MatchStatus
    created_at: datetime

    class Config:
        from_attributes = True

# ============ ADMIN SCHEMAS ============
class AdminStatsResponse(BaseModel):
    total_users: int
    total_vendors: int
    total_requests: int
    avg_match_score: float
    requests_completed: int

class ScoringWeights(BaseModel):
    distance_weight: float = 0.35
    stock_weight: float = 0.20
    rating_weight: float = 0.15
    speed_weight: float = 0.15
    urgency_weight: float = 0.15

# ============ ADMIN MODERATION SCHEMAS ============
class ScoringConfigResponse(BaseModel):
    """Response for scoring weight configuration (FR-406)"""
    id: int
    distance_weight: float
    stock_weight: float
    rating_weight: float
    speed_weight: float
    urgency_weight: float
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class VendorVerificationRequest(BaseModel):
    """Admin verification/flagging request"""
    status: Optional[str] = None  # verified, rejected, flagged
    reason: Optional[str] = None  # Verification/rejection/flagging reason

class VendorModerationResponse(BaseModel):
    """Response for vendor moderation action"""
    id: int
    shop_name: str
    status: str
    is_active: bool
    flagged: bool
    flag_reason: Optional[str] = None
    deactivation_reason: Optional[str] = None
    deactivated_at: Optional[datetime] = None

class RequestFlaggingRequest(BaseModel):
    """Admin request flagging"""
    reason: str

class RequestModerationResponse(BaseModel):
    """Response for request moderation"""
    id: int
    resource_name: str
    quantity: int
    urgency: str
    status: str
    flagged: bool
    flag_reason: Optional[str] = None

class ModerationStatsResponse(BaseModel):
    """Stats for moderation dashboard"""
    pending_vendors: int
    flagged_vendors: int
    flagged_requests: int
    rejected_vendors: int
