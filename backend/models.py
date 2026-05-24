# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Enum, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
# pyrefly: ignore [missing-import]
from database import Base
import enum
from datetime import datetime

class UserRole(str, enum.Enum):
    USER = "USER"             # Changed from DONOR/REQUESTER
    CREATOR = "CREATOR"       # Changed from VENDOR
    ADMIN = "ADMIN"
    REQUESTER = "REQUESTER"   # Legacy support
    DONOR = "DONOR"           # Legacy support
    VENDOR = "VENDOR"         # Legacy support

class UrgencyLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

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
    avatar_url = Column(String, nullable=True) # profile picture URL
    role = Column(Enum(UserRole), default=UserRole.USER)
    phone = Column(String, nullable=True)
    city = Column(String, index=True, nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    organization_name = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    can_switch_role = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

    audit_logs = relationship("AuditLog", back_populates="actor")
    campaigns = relationship("Campaign", back_populates="creator")
    donations = relationship("Donation", back_populates="donor")

    # Follow relationships
    followers = relationship("Follow", foreign_keys="Follow.following_id", back_populates="following", cascade="all, delete-orphan")
    following = relationship("Follow", foreign_keys="Follow.follower_id", back_populates="follower", cascade="all, delete-orphan")

    @property
    def role_name(self):
        return self.role.value

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

# ============ TAXONOMY TABLES ============
class CampaignCategory(Base):
    __tablename__ = "campaign_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, unique=True)
    verification_level = Column(String)  # e.g. "HIGH", "MEDIUM"
    is_active = Column(Boolean, default=True)

    subcategories = relationship("CampaignSubcategory", back_populates="category", cascade="all, delete-orphan")
    ai_rules = relationship("AiValidationRule", back_populates="category", cascade="all, delete-orphan")


class CampaignSubcategory(Base):
    __tablename__ = "campaign_subcategories"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("campaign_categories.id"))
    name = Column(String, index=True)

    category = relationship("CampaignCategory", back_populates="subcategories")
    campaigns = relationship("Campaign", back_populates="subcategory")


class AiValidationRule(Base):
    __tablename__ = "ai_validation_rules"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("campaign_categories.id"))
    capability = Column(String)  # e.g., "OCR", "NLP", "Embeddings"
    description = Column(String) # e.g., "duplicate case detection"

    category = relationship("CampaignCategory", back_populates="ai_rules")

# ============ CAMPAIGNS TABLE ============
class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), index=True)
    title = Column(String, index=True)
    description = Column(Text)
    category_id = Column(Integer, ForeignKey("campaign_categories.id"), nullable=True)
    subcategory_id = Column(Integer, ForeignKey("campaign_subcategories.id"), nullable=True)
    city = Column(String, index=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    goal_amount = Column(Float)
    raised_amount = Column(Float, default=0.0)
    urgency_level = Column(Enum(UrgencyLevel), default=UrgencyLevel.MEDIUM)
    cover_image = Column(Text, nullable=True)
    status = Column(Enum(CampaignStatus), default=CampaignStatus.DRAFT)
    verified = Column(Boolean, default=False)
    deadline = Column(DateTime, nullable=True)
    is_flagged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    
    # AI Metadata Fields
    ai_summary = Column(Text, nullable=True)
    category_tags = Column(String, nullable=True)  # JSON serialized array
    category_confidence = Column(Float, nullable=True)
    toxicity_score = Column(Float, nullable=True)
    spam_risk_score = Column(Float, nullable=True)
    embedding_vector = Column(Text, nullable=True) # JSON serialized float array

    # Document Verification
    verification_doc_url = Column(String, nullable=True)
    verification_ocr_text = Column(Text, nullable=True)

    # Relationships
    creator = relationship("User", back_populates="campaigns")
    taxonomy_category = relationship("CampaignCategory")
    subcategory = relationship("CampaignSubcategory", back_populates="campaigns")
    donations = relationship("Donation", back_populates="campaign", cascade="all, delete-orphan")
    updates = relationship("CampaignUpdate", back_populates="campaign", cascade="all, delete-orphan")
    saved_by = relationship("SavedCampaign", back_populates="campaign", cascade="all, delete-orphan")

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

    @property
    def donor_name(self):
        if self.anonymous:
            return "Anonymous"
        return self.donor.name if self.donor else "Unknown"

    @property
    def donor_city(self):
        if self.anonymous:
            return "Private"
        return self.donor.city if self.donor else "Unknown City"

# ============ CAMPAIGN UPDATES TABLE ============
class CampaignUpdate(Base):
    __tablename__ = "campaign_updates"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), index=True)
    created_by = Column(Integer, ForeignKey("users.id"), index=True)
    content = Column(Text)
    image_url = Column(Text, nullable=True)
    is_pinned = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

    campaign = relationship("Campaign", back_populates="updates")
    creator = relationship("User")
    comments = relationship("UpdateComment", back_populates="update", cascade="all, delete-orphan")
    likes = relationship("UpdateLike", back_populates="update", cascade="all, delete-orphan")

# ============ UPDATE COMMENTS TABLE ============
class UpdateComment(Base):
    __tablename__ = "update_comments"

    id = Column(Integer, primary_key=True, index=True)
    update_id = Column(Integer, ForeignKey("campaign_updates.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    text = Column(Text)
    created_at = Column(DateTime, default=func.now())

    update = relationship("CampaignUpdate", back_populates="comments")
    user = relationship("User")

# ============ UPDATE LIKES TABLE ============
class UpdateLike(Base):
    __tablename__ = "update_likes"

    id = Column(Integer, primary_key=True, index=True)
    update_id = Column(Integer, ForeignKey("campaign_updates.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    created_at = Column(DateTime, default=func.now())

    update = relationship("CampaignUpdate", back_populates="likes")
    user = relationship("User")

# ============ FOLLOW RELATIONSHIP TABLE ============
class Follow(Base):
    __tablename__ = "follows"

    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id"), index=True)
    following_id = Column(Integer, ForeignKey("users.id"), index=True)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    follower = relationship("User", foreign_keys=[follower_id], back_populates="following")
    following = relationship("User", foreign_keys=[following_id], back_populates="followers")

    # Prevent duplicate follows with unique constraint
    __table_args__ = (
        Index('ix_follow_unique', 'follower_id', 'following_id', unique=True),
    )

# ============ SAVED CAMPAIGNS TABLE ============
class SavedCampaign(Base):
    __tablename__ = "saved_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), index=True)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    user = relationship("User", backref="saved_campaigns")
    campaign = relationship("Campaign", back_populates="saved_by")

    # Prevent duplicate saves with unique constraint
    __table_args__ = (
        Index('ix_saved_campaign_unique', 'user_id', 'campaign_id', unique=True),
    )

# ============ CAMPAIGN CREATOR TRUST PROFILE ============
class CampaignCreatorTrust(Base):
    __tablename__ = "campaign_creator_trust"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    
    # Trust factors
    identity_verified = Column(Boolean, default=False)
    historical_fulfillment_rate = Column(Float, default=1.0)
    dispute_rate = Column(Float, default=0.0)
    anomaly_score = Column(Float, default=0.0)
    composite_trust_score = Column(Float, default=0.80)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    user = relationship("User", backref="trust_profile", uselist=False)
