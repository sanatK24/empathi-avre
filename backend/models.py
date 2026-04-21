from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum
from datetime import datetime

class UserRole(str, enum.Enum):
    REQUESTER = "REQUESTER"
    VENDOR = "VENDOR"
    ADMIN = "ADMIN"

class UrgencyLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class RequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    MATCHED = "MATCHED"
    ACCEPTED = "ACCEPTED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class MatchStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED_BY_VENDOR = "ACCEPTED_BY_VENDOR"
    REJECTED_BY_VENDOR = "REJECTED_BY_VENDOR"
    ACCEPTED_BY_REQUESTER = "ACCEPTED_BY_REQUESTER"
    CANCELLED_BY_REQUESTER = "CANCELLED_BY_REQUESTER"
    COMPLETED = "COMPLETED"

class VerificationStatus(str, enum.Enum):
    UNVERIFIED = "UNVERIFIED"
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"

class CampaignStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    DRAFT = "DRAFT"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class DonationStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"

# ============ USERS TABLE ============
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=True) # Nullable for social users
    social_provider = Column(String, nullable=True) # e.g., 'google'
    social_id = Column(String, nullable=True) # provider-specific user ID
    avatar_url = Column(String, nullable=True) # profile picture URL
    role = Column(Enum(UserRole), default=UserRole.REQUESTER)
    phone = Column(String, nullable=True)
    city = Column(String, index=True, nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    organization_name = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

    # Emergency-related fields
    blood_group = Column(String, nullable=True)
    emergency_contact_name = Column(String, nullable=True)
    emergency_contact_phone = Column(String, nullable=True)
    preferred_hospital = Column(String, nullable=True)
    saved_addresses = Column(Text, nullable=True) # JSON or Comma separated
    accessibility_needs = Column(Text, nullable=True)
    personal_categories = Column(Text, nullable=True) # Comma separated custom categories

    requests = relationship("Request", back_populates="requester")
    vendor = relationship("Vendor", uselist=False, back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="actor")
    campaigns = relationship("Campaign", back_populates="creator")
    donations = relationship("Donation", back_populates="donor")
    emergency_contacts = relationship("UserEmergencyContact", back_populates="user", cascade="all, delete-orphan")

# ============ VENDORS TABLE ============
class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    shop_name = Column(String, index=True)
    category = Column(String, index=True)  # e.g., "pharmacy", "grocery", "medical"
    lat = Column(Float)
    lng = Column(Float)
    city = Column(String, index=True)
    rating = Column(Float, default=0.0)
    reliability_score = Column(Float, default=1.0) # 0.0 to 1.0
    avg_response_time = Column(Integer, default=15)  # minutes
    service_radius = Column(Float, default=10.0) # km
    service_areas = Column(Text, nullable=True) # comma separated
    registration_id = Column(String, nullable=True) # GST or license
    lead_time = Column(String, nullable=True) # e.g. "2 hours"
    verification_status = Column(Enum(VerificationStatus), default=VerificationStatus.UNVERIFIED)
    opening_hours = Column(String, nullable=True) # e.g. "09:00-21:00"
    is_active = Column(Boolean, default=True)
    total_completed_orders = Column(Integer, default=0)
    fairness_penalty = Column(Float, default=0.0)  # Used by AVRE to prevent monopoly
    created_at = Column(DateTime, default=func.now())

    user = relationship("User", back_populates="vendor")
    inventory = relationship("Inventory", back_populates="vendor", cascade="all, delete-orphan")
    matches_received = relationship("Match", back_populates="vendor", cascade="all, delete-orphan")

# ============ INVENTORY TABLE ============
class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), index=True)
    resource_name = Column(String, index=True)
    category = Column(String, index=True)
    sku_code = Column(String, index=True, nullable=True)
    brand_name = Column(String, nullable=True)
    quantity = Column(Integer)
    reserved_quantity = Column(Integer, default=0)
    reorder_level = Column(Integer, default=10)
    price = Column(Float, nullable=True)
    expiry_date = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    vendor = relationship("Vendor", back_populates="inventory")

# ============ REQUESTS TABLE ============
class Request(Base):
    __tablename__ = "requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    resource_name = Column(String, index=True)
    category = Column(String, index=True)
    quantity = Column(Integer)
    location_lat = Column(Float)
    location_lng = Column(Float)
    city = Column(String, index=True)
    urgency_level = Column(Enum(UrgencyLevel), default=UrgencyLevel.MEDIUM)
    preferred_eta = Column(Integer, nullable=True) # preferred minutes
    notes = Column(Text, nullable=True)
    special_instructions = Column(Text, nullable=True)
    status = Column(Enum(RequestStatus), default=RequestStatus.PENDING)
    requester_rating = Column(Float, default=5.0)
    payment_mode = Column(String, default="cod") # e.g. cod, online, donation
    fulfilled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())

    requester = relationship("User", back_populates="requests")
    matches = relationship("Match", back_populates="request", cascade="all, delete-orphan")

# ============ MATCHES TABLE ============
class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"), index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), index=True)
    score = Column(Float)
    ml_score = Column(Float, nullable=True)
    rule_score = Column(Float, nullable=True)
    explanation_json = Column(Text, nullable=True) # Story behind the match
    response_eta = Column(Integer, nullable=True) # vendor's quoted time
    selected_flag = Column(Boolean, default=False)
    status = Column(Enum(MatchStatus), default=MatchStatus.PENDING)
    created_at = Column(DateTime, default=func.now())

    request = relationship("Request", back_populates="matches")
    vendor = relationship("Vendor", back_populates="matches_received")

# ============ AUDIT LOGS TABLE ============
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    actor_role = Column(String, nullable=True)
    action = Column(String)
    resource_type = Column(String)
    resource_id = Column(Integer, nullable=True)
    severity = Column(String, default="info") # info, warning, critical
    ip_address = Column(String, nullable=True)
    trace_id = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=func.now())

    actor = relationship("User", back_populates="audit_logs")

# ============ ADMIN SCORING CONFIG ============
class ScoringConfig(Base):
    __tablename__ = "scoring_config"

    id = Column(Integer, primary_key=True, index=True)
    ml_weight = Column(Float, default=0.4)
    urgency_weight = Column(Float, default=0.2)
    fairness_weight = Column(Float, default=0.1)
    stock_weight = Column(Float, default=0.2)
    freshness_weight = Column(Float, default=0.1)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

# ============ CAMPAIGNS TABLE ============
class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), index=True)
    title = Column(String, index=True)
    description = Column(Text)
    category = Column(String, index=True)  # e.g., "medical", "food", "shelter"
    city = Column(String, index=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    goal_amount = Column(Float)
    raised_amount = Column(Float, default=0.0)
    urgency_level = Column(Enum(UrgencyLevel), default=UrgencyLevel.MEDIUM)
    cover_image = Column(String, nullable=True)
    status = Column(Enum(CampaignStatus), default=CampaignStatus.DRAFT)
    verified = Column(Boolean, default=False)
    deadline = Column(DateTime, nullable=True)
    is_flagged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    creator = relationship("User", backref="campaign_list")
    donations = relationship("Donation", back_populates="campaign", cascade="all, delete-orphan")
    updates = relationship("CampaignUpdate", back_populates="campaign", cascade="all, delete-orphan")

    @property
    def creator_name(self):
        return self.creator.name if self.creator else "Unknown User"

    @property
    def creator_avatar(self):
        return self.creator.avatar_url if self.creator else None


# ============ DONATIONS TABLE ============
class Donation(Base):
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    amount = Column(Float)
    anonymous = Column(Boolean, default=False)
    message = Column(Text, nullable=True)
    status = Column(Enum(DonationStatus), default=DonationStatus.COMPLETED)
    created_at = Column(DateTime, default=func.now())

    campaign = relationship("Campaign", back_populates="donations")
    donor = relationship("User", back_populates="donations")

# ============ CAMPAIGN UPDATES TABLE ============
class CampaignUpdate(Base):
    __tablename__ = "campaign_updates"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), index=True)
    title = Column(String)
    content = Column(Text)
    created_at = Column(DateTime, default=func.now())

    campaign = relationship("Campaign", back_populates="updates")

# ============ EMERGENCY DIRECTORY ============
class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    phone = Column(String)
    category = Column(String) # Police, Medical, Fire, Women, Child, etc.
    description = Column(String, nullable=True)
    city = Column(String, default="National") # National or specific city
    is_pinned = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

class PublicFacility(Base):
    __tablename__ = "public_facilities"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    facility_type = Column(String) # Hospital, Clinic, Trauma Center, Blood Bank
    address = Column(String)
    city = Column(String, index=True)
    phone = Column(String, nullable=True)
    lat = Column(Float)
    lng = Column(Float)
    is_verified = Column(Boolean, default=True)
    operating_hours = Column(String, default="24/7")
    rating = Column(Float, default=4.0)
    created_at = Column(DateTime, default=func.now())

class UserEmergencyContact(Base):
    __tablename__ = "user_emergency_contacts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    name = Column(String)
    phone = Column(String)
    category = Column(String) # Family, Doctor, Neighbor, etc.
    created_at = Column(DateTime, default=func.now())

    user = relationship("User", back_populates="emergency_contacts")


