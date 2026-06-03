from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime
from models import UserRole, UrgencyLevel, CampaignStatus, DonationStatus

def to_upper(v): return v.upper() if isinstance(v, str) else v

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: UserRole = UserRole.USER
    phone: Optional[str] = None
    city: Optional[str] = None
    organization_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool = True
    can_switch_role: bool = False
    address: Optional[str] = None
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    locality: Optional[str] = None
    state_province: Optional[str] = None
    postal_code: Optional[str] = None
    country_code: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    blood_group: Optional[str] = None
    preferred_hospital: Optional[str] = None
    accessibility_needs: Optional[str] = None
    personal_categories: Optional[str] = None
    @field_validator('role', mode='before')
    @classmethod
    def validate_role(cls, v): return to_upper(v)

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
    address: Optional[str] = None
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    locality: Optional[str] = None
    state_province: Optional[str] = None
    postal_code: Optional[str] = None
    country_code: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    blood_group: Optional[str] = None
    preferred_hospital: Optional[str] = None
    accessibility_needs: Optional[str] = None
    personal_categories: Optional[str] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime
    class Config: from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class EmergencyContactBase(BaseModel):
    name: str
    phone: str
    category: str = "Family"

class EmergencyContactCreate(EmergencyContactBase): pass

class EmergencyContactResponse(EmergencyContactBase):
    id: int
    user_id: int
    class Config: from_attributes = True

class UserProfileResponse(UserResponse):
    emergency_contacts: List[EmergencyContactResponse] = []
    class Config: from_attributes = True

class AiValidationRuleResponse(BaseModel):
    id: int
    capability: str
    description: str
    class Config: from_attributes = True

class CampaignSubcategoryResponse(BaseModel):
    id: int
    name: str
    class Config: from_attributes = True

class CampaignCategoryResponse(BaseModel):
    id: int
    name: str
    verification_level: str
    is_active: bool
    subcategories: List[CampaignSubcategoryResponse] = []
    ai_rules: List[AiValidationRuleResponse] = []
    class Config: from_attributes = True

class CampaignBase(BaseModel):
    title: str = Field(..., min_length=5, max_length=100)
    description: str = Field(..., min_length=20)
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    category: Optional[str] = None
    city: str
    goal_amount: float = Field(..., gt=0)
    urgency_level: UrgencyLevel = UrgencyLevel.MEDIUM
    cover_image: Optional[str] = None
    deadline: Optional[datetime] = None
    verification_doc_url: Optional[str] = None
    ai_analysis_data: Optional[str] = None
    @field_validator('urgency_level', mode='before')
    @classmethod
    def validate_urgency(cls, v): return to_upper(v)

class CampaignCreate(CampaignBase): pass

class CampaignUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=100)
    description: Optional[str] = Field(None, min_length=20)
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    category: Optional[str] = None
    city: Optional[str] = None
    goal_amount: Optional[float] = Field(None, gt=0)
    urgency_level: Optional[UrgencyLevel] = None
    cover_image: Optional[str] = None
    deadline: Optional[datetime] = None
    status: Optional[CampaignStatus] = None
    verification_doc_url: Optional[str] = None
    ai_analysis_data: Optional[str] = None
    @field_validator('urgency_level', 'status', mode='before')
    @classmethod
    def validate_enums(cls, v): return to_upper(v)

class CampaignResponse(CampaignBase):
    id: int
    created_by: int
    raised_amount: float
    status: CampaignStatus
    verified: bool
    is_flagged: bool
    created_at: datetime
    creator_name: Optional[str] = None
    creator_avatar: Optional[str] = None
    ai_analysis_data: Optional[str] = None
    class Config: from_attributes = True

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
    class Config: from_attributes = True

class DonationWithDonorResponse(DonationResponse):
    donor_name: str
    donor_city: Optional[str]
    class Config: from_attributes = True

class DonationHistoryResponse(DonationResponse):
    campaign_title: Optional[str] = None
    class Config: from_attributes = True

class CampaignUpdateCreate(BaseModel):
    content: str = Field(..., min_length=10)
    image_url: Optional[str] = None

class UpdateCommentCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)

class UpdateCommentResponse(BaseModel):
    id: int
    update_id: int
    user_id: int
    text: str
    created_at: datetime
    user: Optional[UserResponse] = None
    class Config: from_attributes = True

class CampaignUpdateResponse(BaseModel):
    id: int
    campaign_id: int
    created_by: int
    content: str
    image_url: Optional[str]
    is_pinned: bool
    created_at: datetime
    creator: Optional[UserResponse] = None
    comments: List[UpdateCommentResponse] = []
    likes_count: int = 0
    has_liked: bool = False
    class Config: from_attributes = True

class AdminStats(BaseModel):
    total_users: int
    total_campaigns: int
    active_campaigns: int
    total_donors: int
    system_alerts: int

class CampaignVerifyRequest(BaseModel): verified: bool

class PublicUserProfileResponse(BaseModel):
    id: int
    name: str
    avatar_url: Optional[str]
    bio: Optional[str]
    role: str
    city: Optional[str]
    organization_name: Optional[str]
    created_at: datetime
    followers_count: int = 0
    following_count: int = 0
    campaigns_count: int = 0
    is_following: bool = False
    class Config: from_attributes = True

class UserFollowerResponse(BaseModel):
    id: int
    name: str
    avatar_url: Optional[str]
    role: str
    class Config: from_attributes = True

class FollowResponse(BaseModel):
    status: str
    is_following: bool
