"""Real-time event types and schemas for notification system (FR-305+)."""
from enum import Enum
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any, Dict, List

# ============ EVENT TYPES ============
class EventType(str, Enum):
    """Events emitted by the AVRE system for real-time notifications."""
    VENDOR_MATCHED = "vendor.matched"           # Vendor is matched to request (FR-305)
    MATCH_ACCEPTED_BY_VENDOR = "match.accepted_by_vendor"  # Vendor accepts
    MATCH_REJECTED_BY_VENDOR = "match.rejected_by_vendor"  # Vendor rejects
    MATCH_ACCEPTED_BY_REQUESTER = "match.accepted_by_requester"  # Requester accepts vendor
    MATCH_CANCELLED = "match.cancelled"         # Requester cancelled
    VENDOR_FLAGGED = "vendor.flagged"          # Vendor flagged by admin
    VENDOR_VERIFIED = "vendor.verified"        # Vendor approved by admin
    VENDOR_REJECTED = "vendor.rejected"        # Vendor rejected by admin
    VENDOR_RATING_UPDATED = "vendor.rating_updated"  # Rating changed
    REQUEST_FLAGGED = "request.flagged"        # Request flagged as spam

# ============ EVENT PAYLOADS ============
class EventPayload(BaseModel):
    """Base event structure for all notifications."""
    event_type: EventType
    timestamp: datetime
    data: Dict[str, Any]  # Event-specific data
    
    class Config:
        from_attributes = True

class VendorMatchedEvent(BaseModel):
    """Vendor matched to a request (FR-305)."""
    vendor_id: int
    vendor_name: str
    request_id: int
    resource_name: str
    quantity: int
    urgency: str
    match_score: float
    distance: float
    eta: int

class MatchAcceptedByVendorEvent(BaseModel):
    """Vendor accepted a match."""
    vendor_id: int
    vendor_name: str
    match_id: int
    request_id: int
    requester_id: int
    resource_name: str

class MatchRejectedByVendorEvent(BaseModel):
    """Vendor rejected a match."""
    vendor_id: int
    vendor_name: str
    match_id: int
    request_id: int
    requester_id: int
    resource_name: str

class MatchAcceptedByRequesterEvent(BaseModel):
    """Requester accepted a vendor."""
    requester_id: int
    match_id: int
    request_id: int
    vendor_id: int
    vendor_name: str
    resource_name: str
    new_vendor_rating: float

class MatchCancelledEvent(BaseModel):
    """Requester cancelled request/match."""
    request_id: int
    requester_id: int
    affected_vendor_ids: List[int]  # Vendors who lost this opportunity
    resource_name: str

class VendorFlaggedEvent(BaseModel):
    """Vendor flagged by admin."""
    vendor_id: int
    vendor_name: str
    reason: str
    flagged_at: datetime

class VendorVerifiedEvent(BaseModel):
    """Vendor approved by admin."""
    vendor_id: int
    vendor_name: str
    verified_at: datetime

class VendorRejectedEvent(BaseModel):
    """Vendor registration rejected by admin."""
    vendor_id: int
    vendor_name: str
    reason: str
    rejected_at: datetime

class VendorRatingUpdatedEvent(BaseModel):
    """Vendor rating changed."""
    vendor_id: int
    vendor_name: str
    old_rating: float
    new_rating: float
    updated_at: datetime

class RequestFlaggedEvent(BaseModel):
    """Request flagged as spam/abuse."""
    request_id: int
    requester_id: int
    reason: str
    flagged_at: datetime
