from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum
from datetime import datetime

class UserRole(str, enum.Enum):
    REQUESTER = "requester"
    VENDOR = "vendor"
    ADMIN = "admin"

class UrgencyLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class RequestStatus(str, enum.Enum):
    PENDING = "pending"
    MATCHED = "matched"
    ACCEPTED = "accepted"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class MatchStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED_BY_VENDOR = "accepted_by_vendor"
    REJECTED_BY_VENDOR = "rejected_by_vendor"
    ACCEPTED_BY_REQUESTER = "accepted_by_requester"
    CANCELLED_BY_REQUESTER = "cancelled_by_requester"
    COMPLETED = "completed"

class VerificationStatus(str, enum.Enum):
    UNVERIFIED = "unverified"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"

class CampaignStatus(str, enum.Enum):
    ACTIVE = "active"
    DRAFT = "draft"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class DonationStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

# ============ USERS TABLE ============
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.REQUESTER)
    phone = Column(String, nullable=True)
    city = Column(String, index=True, nullable=True)
    organization_name = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

    requests = relationship("Request", back_populates="requester")
    vendor = relationship("Vendor", uselist=False, back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="actor")
    campaigns = relationship("Campaign", back_populates="creator")
    donations = relationship("Donation", back_populates="donor")

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
    goal_amount = Column(Float)
    raised_amount = Column(Float, default=0.0)
    urgency_level = Column(Enum(UrgencyLevel), default=UrgencyLevel.MEDIUM)
    cover_image = Column(String, nullable=True)
    status = Column(Enum(CampaignStatus), default=CampaignStatus.DRAFT)
    verified = Column(Boolean, default=False)
    deadline = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())

    creator = relationship("User", back_populates="campaigns")
    donations = relationship("Donation", back_populates="campaign", cascade="all, delete-orphan")
    updates = relationship("CampaignUpdate", back_populates="campaign", cascade="all, delete-orphan")

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


