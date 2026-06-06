import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Enum, ForeignKey, Text, Index
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from database import Base
class UserRole(str, enum.Enum):
    USER = 'USER'
    CREATOR = 'CREATOR'
    ADMIN = 'ADMIN'
    DONOR = 'DONOR'
class UrgencyLevel(str, enum.Enum):
    LOW = 'LOW'
    MEDIUM = 'MEDIUM'
    HIGH = 'HIGH'
    CRITICAL = 'CRITICAL'
class CampaignStatus(str, enum.Enum):
    ACTIVE = 'ACTIVE'
    DRAFT = 'DRAFT'
    COMPLETED = 'COMPLETED'
    CANCELLED = 'CANCELLED'
class DonationStatus(str, enum.Enum):
    PENDING = 'PENDING'
    COMPLETED = 'COMPLETED'
    FAILED = 'FAILED'
    REFUNDED = 'REFUNDED'
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    (name, email) = (Column(String, index=True), Column(String, unique=True, index=True))
    (password_hash, avatar_url) = (Column(String, nullable=True), Column(String, nullable=True))
    role = Column(Enum(UserRole), default=UserRole.USER)
    (phone, city) = (Column(String, nullable=True), Column(String, index=True, nullable=True))
    (lat, lng) = (Column(Float, nullable=True), Column(Float, nullable=True))
    bio = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    address = Column(Text, nullable=True)
    (address_line_1, address_line_2) = (Column(String, nullable=True), Column(String, nullable=True))
    (locality, state_province) = (Column(String, nullable=True), Column(String, nullable=True))
    (postal_code, country_code) = (Column(String, nullable=True), Column(String, nullable=True))
    (blood_group, preferred_hospital) = (Column(String, nullable=True), Column(String, nullable=True))
    (accessibility_needs, personal_categories) = (Column(Text, nullable=True), Column(Text, nullable=True))
    audit_logs = relationship('AuditLog', back_populates='actor')
    campaigns = relationship('Campaign', back_populates='creator')
    donations = relationship('Donation', back_populates='donor')
    emergency_contacts = relationship('EmergencyContact', back_populates='user', cascade='all, delete-orphan')
    followers = relationship('Follow', foreign_keys='Follow.following_id', back_populates='following', cascade='all, delete-orphan')
    following = relationship('Follow', foreign_keys='Follow.follower_id', back_populates='follower', cascade='all, delete-orphan')
    role_name = property(lambda self: self.role.value)
class EmergencyContact(Base):
    __tablename__ = 'emergency_contacts'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), index=True)
    (name, phone) = (Column(String, nullable=False), Column(String, nullable=False))
    category = Column(String, default='Family')
    created_at = Column(DateTime, default=func.now())
    user = relationship('User', back_populates='emergency_contacts')
class AuditLog(Base):
    __tablename__ = 'audit_logs'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    actor_role = Column(String, nullable=True)
    (action, resource_type) = (Column(String), Column(String))
    resource_id = Column(Integer, nullable=True)
    severity = Column(String, default='info')
    (ip_address, trace_id) = (Column(String, nullable=True), Column(String, nullable=True))
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=func.now())
    actor = relationship('User', back_populates='audit_logs')
class CampaignCategory(Base):
    __tablename__ = 'campaign_categories'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, unique=True)
    verification_level = Column(String)
    is_active = Column(Boolean, default=True)
    subcategories = relationship('CampaignSubcategory', back_populates='category', cascade='all, delete-orphan')
    ai_rules = relationship('AiValidationRule', back_populates='category', cascade='all, delete-orphan')
class CampaignSubcategory(Base):
    __tablename__ = 'campaign_subcategories'
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey('campaign_categories.id'))
    name = Column(String, index=True)
    category = relationship('CampaignCategory', back_populates='subcategories')
    campaigns = relationship('Campaign', back_populates='subcategory')
class AiValidationRule(Base):
    __tablename__ = 'ai_validation_rules'
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey('campaign_categories.id'))
    (capability, description) = (Column(String), Column(String))
    category = relationship('CampaignCategory', back_populates='ai_rules')
class Campaign(Base):
    __tablename__ = 'campaigns'
    id = Column(Integer, primary_key=True, index=True)
    created_by = Column(Integer, ForeignKey('users.id'), index=True)
    title = Column(String, index=True)
    description = Column(Text)
    category_id = Column(Integer, ForeignKey('campaign_categories.id'), nullable=True)
    subcategory_id = Column(Integer, ForeignKey('campaign_subcategories.id'), nullable=True)
    city = Column(String, index=True)
    (lat, lng) = (Column(Float, nullable=True), Column(Float, nullable=True))
    goal_amount = Column(Float)
    raised_amount = Column(Float, default=0.0)
    urgency_level = Column(Enum(UrgencyLevel), default=UrgencyLevel.MEDIUM)
    cover_image = Column(Text, nullable=True)
    status = Column(Enum(CampaignStatus), default=CampaignStatus.DRAFT)
    verified = Column(Boolean, default=False)
    trust_score = Column(Float, default=0.0)
    verification_status = Column(String, default='PENDING')
    deadline = Column(DateTime, nullable=True)
    is_flagged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    (ai_summary, ai_analysis_data, embedding_vector) = (Column(Text, nullable=True), Column(Text, nullable=True), Column(Text, nullable=True))
    (category_tags, verification_doc_url) = (Column(String, nullable=True), Column(String, nullable=True))
    category_confidence = Column(Float, nullable=True)
    (toxicity_score, spam_risk_score) = (Column(Float, nullable=True), Column(Float, nullable=True))
    creator = relationship('User', back_populates='campaigns')
    taxonomy_category = relationship('CampaignCategory')
    subcategory = relationship('CampaignSubcategory', back_populates='campaigns')
    donations = relationship('Donation', back_populates='campaign', cascade='all, delete-orphan')
    updates = relationship('CampaignUpdate', back_populates='campaign', cascade='all, delete-orphan')
    saved_by = relationship('SavedCampaign', back_populates='campaign', cascade='all, delete-orphan')
    reports = relationship('CampaignReport', back_populates='campaign', cascade='all, delete-orphan')
    creator_name = property(lambda self: self.creator.name if self.creator else 'Unknown User')
    creator_avatar = property(lambda self: self.creator.avatar_url if self.creator else None)
    def _get_category(self):
        if self.taxonomy_category:
            return self.taxonomy_category.name
        try:
            import json
            tags = json.loads(self.category_tags) if self.category_tags else []
            if tags and isinstance(tags, list) and tags:
                return str(tags[0]).title()
        except:
            pass
        return 'General'
    category = property(_get_category)
class Donation(Base):
    __tablename__ = 'donations'
    id = Column(Integer, primary_key=True, index=True)
    (campaign_id, user_id) = (Column(Integer, ForeignKey('campaigns.id'), index=True), Column(Integer, ForeignKey('users.id'), index=True))
    amount = Column(Float)
    anonymous = Column(Boolean, default=False)
    message = Column(Text, nullable=True)
    status = Column(Enum(DonationStatus), default=DonationStatus.COMPLETED)
    created_at = Column(DateTime, default=func.now())
    campaign = relationship('Campaign', back_populates='donations')
    donor = relationship('User', back_populates='donations')
    donor_name = property(lambda self: 'Anonymous' if self.anonymous else self.donor.name if self.donor else 'Unknown')
    donor_city = property(lambda self: 'Private' if self.anonymous else self.donor.city if self.donor else 'Unknown City')
class CampaignUpdate(Base):
    __tablename__ = 'campaign_updates'
    id = Column(Integer, primary_key=True, index=True)
    (campaign_id, created_by) = (Column(Integer, ForeignKey('campaigns.id'), index=True), Column(Integer, ForeignKey('users.id'), index=True))
    content = Column(Text)
    image_url = Column(Text, nullable=True)
    is_pinned = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    campaign = relationship('Campaign', back_populates='updates')
    creator = relationship('User')
    comments = relationship('UpdateComment', back_populates='update', cascade='all, delete-orphan')
    likes = relationship('UpdateLike', back_populates='update', cascade='all, delete-orphan')
class UpdateComment(Base):
    __tablename__ = 'update_comments'
    id = Column(Integer, primary_key=True, index=True)
    (update_id, user_id) = (Column(Integer, ForeignKey('campaign_updates.id'), index=True), Column(Integer, ForeignKey('users.id'), index=True))
    text = Column(Text)
    created_at = Column(DateTime, default=func.now())
    update = relationship('CampaignUpdate', back_populates='comments')
    user = relationship('User')
class UpdateLike(Base):
    __tablename__ = 'update_likes'
    id = Column(Integer, primary_key=True, index=True)
    (update_id, user_id) = (Column(Integer, ForeignKey('campaign_updates.id'), index=True), Column(Integer, ForeignKey('users.id'), index=True))
    created_at = Column(DateTime, default=func.now())
    update = relationship('CampaignUpdate', back_populates='likes')
    user = relationship('User')
class Follow(Base):
    __tablename__ = 'follows'
    id = Column(Integer, primary_key=True, index=True)
    (follower_id, following_id) = (Column(Integer, ForeignKey('users.id'), index=True), Column(Integer, ForeignKey('users.id'), index=True))
    created_at = Column(DateTime, default=func.now())
    follower = relationship('User', foreign_keys=[follower_id], back_populates='following')
    following = relationship('User', foreign_keys=[following_id], back_populates='followers')
    __table_args__ = (Index('ix_follow_unique', 'follower_id', 'following_id', unique=True),)
class SavedCampaign(Base):
    __tablename__ = 'saved_campaigns'
    id = Column(Integer, primary_key=True, index=True)
    (user_id, campaign_id) = (Column(Integer, ForeignKey('users.id'), index=True), Column(Integer, ForeignKey('campaigns.id'), index=True))
    created_at = Column(DateTime, default=func.now())
    user = relationship('User', backref='saved_campaigns')
    campaign = relationship('Campaign', back_populates='saved_by')
    __table_args__ = (Index('ix_saved_campaign_unique', 'user_id', 'campaign_id', unique=True),)
class CampaignCreatorTrust(Base):
    __tablename__ = 'campaign_creator_trust'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True, index=True)
    identity_verified = Column(Boolean, default=False)
    (historical_fulfillment_rate, dispute_rate, anomaly_score, composite_trust_score) = (Column(Float, default=1.0), Column(Float, default=0.0), Column(Float, default=0.0), Column(Float, default=0.8))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    user = relationship('User', backref='trust_profile', uselist=False)
class CampaignReport(Base):
    __tablename__ = 'campaign_reports'
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey('campaigns.id'), index=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True)
    reason = Column(Text, nullable=False)
    ai_analysis = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    campaign = relationship('Campaign', back_populates='reports')
    user = relationship('User')
class VerificationReport(Base):
    __tablename__ = 'verification_reports'
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey('campaigns.id', ondelete='CASCADE'), index=True)
    metadata_score = Column(Float, default=1.0)
    ela_score = Column(Float, default=1.0)
    ocr_confidence = Column(Float, default=1.0)
    billing_score = Column(Float, default=1.0)
    hospital_score = Column(Float, default=1.0)
    fraud_probability = Column(Float, default=0.0)
    report_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    campaign = relationship('Campaign', backref=backref('verification_report', uselist=False))
