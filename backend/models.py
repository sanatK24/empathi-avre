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

class VendorStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    FLAGGED = "flagged"

# ============ USERS TABLE ============
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.REQUESTER)
    created_at = Column(DateTime, default=func.now())

    requests = relationship("Request", back_populates="requester")
    vendor = relationship("Vendor", uselist=False, back_populates="user")

# ============ VENDORS TABLE ============
class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    shop_name = Column(String, index=True)
    category = Column(String, index=True)  # e.g., "pharmacy", "grocery", "medical"
    latitude = Column(Float)
    longitude = Column(Float)
    rating = Column(Float, default=0.0)
    avg_response_time = Column(Integer, default=15)  # minutes
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    
    # Verification & Moderation (FR-401-406)
    status = Column(Enum(VendorStatus), default=VendorStatus.PENDING)  # pending → verified/rejected/flagged
    verification_reason = Column(String, nullable=True)  # Why verified/rejected
    flagged = Column(Boolean, default=False)  # Flagged for review
    flag_reason = Column(String, nullable=True)  # Why flagged
    
    # Deactivation Audit (Option C)
    deactivation_reason = Column(String, nullable=True)  # Why deactivated
    deactivated_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Admin who deactivated
    deactivated_at = Column(DateTime, nullable=True)  # When deactivated

    user = relationship("User", back_populates="vendor")
    inventory = relationship("Inventory", back_populates="vendor", cascade="all, delete-orphan")
    matches_received = relationship("Match", back_populates="vendor", cascade="all, delete-orphan")

# ============ INVENTORY TABLE ============
class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), index=True)
    resource_name = Column(String, index=True)
    quantity = Column(Integer)
    price = Column(Float, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    vendor = relationship("Vendor", back_populates="inventory")

# ============ REQUESTS TABLE ============
class Request(Base):
    __tablename__ = "requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    resource_name = Column(String, index=True)
    quantity = Column(Integer)
    latitude = Column(Float)
    longitude = Column(Float)
    urgency = Column(Enum(UrgencyLevel), default=UrgencyLevel.MEDIUM)
    status = Column(Enum(RequestStatus), default=RequestStatus.PENDING)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    notes = Column(String, nullable=True)
    
    # Moderation (Option B)
    flagged = Column(Boolean, default=False)  # Flagged for spam/abuse
    flag_reason = Column(String, nullable=True)  # Why flagged

    requester = relationship("User", back_populates="requests")
    matches = relationship("Match", back_populates="request", cascade="all, delete-orphan")

# ============ MATCHES TABLE ============
class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"), index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), index=True)
    score = Column(Float)
    distance_score = Column(Float, default=0.0)
    stock_score = Column(Float, default=0.0)
    rating_score = Column(Float, default=0.0)
    speed_score = Column(Float, default=0.0)
    urgency_score = Column(Float, default=0.0)
    status = Column(Enum(MatchStatus), default=MatchStatus.PENDING)
    created_at = Column(DateTime, default=func.now())

    request = relationship("Request", back_populates="matches")
    vendor = relationship("Vendor", back_populates="matches_received")

# ============ ADMIN SCORING CONFIG ============
class ScoringConfig(Base):
    """
    Global AVRE scoring weights configuration (FR-406).
    Admins can tune weights to adjust vendor matching behavior.
    Singleton table: only one active config at a time.
    """
    __tablename__ = "scoring_config"

    id = Column(Integer, primary_key=True, index=True)
    distance_weight = Column(Float, default=0.35)
    stock_weight = Column(Float, default=0.20)
    rating_weight = Column(Float, default=0.15)
    speed_weight = Column(Float, default=0.15)
    urgency_weight = Column(Float, default=0.15)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Admin who updated
