# Admin Module Patterns (FR-401 to FR-406) - Complete Implementation

## Status: ✅ FULLY IMPLEMENTED

All admin features implemented with reusable moderation patterns, scoring weight configuration, and audit trails. Features can be toggled/removed as needed.

---

## Feature Coverage

### ✅ FR-401: List All Users
**Endpoint**: `GET /admin/users`
- Lists all registered users with id, name, email, role, created_at
- Admin-only access via `get_current_admin()` guard

### ✅ FR-402: List All Vendors
**Endpoint**: `GET /admin/vendors`
- Lists all vendors with shop details, rating, active status
- Returns: id, user_id, shop_name, category, geo, rating, is_active, created_at

### ✅ FR-403: List All Requests
**Endpoint**: `GET /admin/requests`
- Lists all requests with resource details and status
- Returns: id, user_id, resource_name, quantity, urgency, status, created_at

### ✅ FR-404: Deactivate/Remove Entries
**Endpoints**: 
- `DELETE /admin/users/{user_id}` - Remove user
- `POST /admin/vendors/{vendor_id}/deactivate` - Deactivate vendor with reason & audit trail
- `POST /admin/vendors/{vendor_id}/activate` - Re-activate vendor

### ✅ FR-405: Aggregate Statistics
**Endpoint**: `GET /admin/stats`
- Returns: total_users, total_vendors, total_requests, avg_match_score, requests_completed

### ✅ FR-406: AVRE Scoring Weight Configuration (Fully Wired)
**Endpoints**:
- `GET /admin/scoring-weights` - Retrieve current weights from database
- `PUT /admin/scoring-weights` - Update weights, persist to DB, wire to engine

---

## Option A: Scoring Weights Persistence & Runtime Loading

### Implementation

**Database Model** (`ScoringConfig`):
```python
class ScoringConfig(Base):
    id = Column(Integer, primary_key=True)
    distance_weight = Column(Float, default=0.35)
    stock_weight = Column(Float, default=0.20)
    rating_weight = Column(Float, default=0.15)
    speed_weight = Column(Float, default=0.15)
    urgency_weight = Column(Float, default=0.15)
    updated_at = Column(DateTime, onupdate=func.now())
    updated_by = Column(Integer, FK("users.id"))  # Audit trail
```

**Admin Endpoints** (Fully Wired):
```
PUT /admin/scoring-weights → Save to DB
GET /admin/scoring-weights → Load from DB
```

**Engine Integration** (Requester Module):
```python
# In GET /requests/{id}/matches:
scoring_config = db.query(ScoringConfig).first()
weights = ScoringWeights(
    distance_weight=scoring_config.distance_weight,
    stock_weight=scoring_config.stock_weight,
    ...
)
engine = AVREEngine(weights=weights)  # Uses admin config
```

**Result**: Admins can now tune AVRE behavior at runtime without code changes.

---

## Option B: Vendor & Request Moderation Workflows

### Vendor Verification Pipeline (New VendorStatus Enum)

**States**:
- `PENDING` - New vendor registration, awaiting verification
- `VERIFIED` - Admin approved
- `REJECTED` - Admin rejected (auto-deactivated)
- `FLAGGED` - Flagged for review (suspicious activity)

**Endpoints**:

| Endpoint | Action | Result |
|----------|--------|--------|
| `POST /admin/moderation/vendors/{id}/verify` | Approve vendor | status = VERIFIED |
| `POST /admin/moderation/vendors/{id}/reject` | Reject registration | status = REJECTED, is_active = false |
| `POST /admin/moderation/vendors/{id}/flag` | Flag for review | status = FLAGGED, flagged = true |
| `POST /admin/moderation/vendors/{id}/unflag` | Remove flag | flagged = false |
| `GET /admin/moderation/vendors/pending` | Review queue | List pending vendors |

**Database Fields Added**:
```python
class Vendor(Base):
    status = Column(Enum(VendorStatus), default=VendorStatus.PENDING)
    verification_reason = Column(String, nullable=True)  # Why verified/rejected
    flagged = Column(Boolean, default=False)  # Suspicious activity
    flag_reason = Column(String, nullable=True)  # Why flagged
```

**Pattern: Moderation Access Control**
```python
def verify_vendor(...):
    if user.role != UserRole.ADMIN:
        raise HTTPException(403, "Admin access required")
```

### Request Flagging for Spam/Abuse

**Endpoints**:
- `GET /admin/moderation/requests/flagged` - List flagged requests
- `POST /admin/moderation/requests/{id}/flag` - Flag request as spam
- `POST /admin/moderation/requests/{id}/unflag` - Clear flag

**Database Fields Added**:
```python
class Request(Base):
    flagged = Column(Boolean, default=False)
    flag_reason = Column(String, nullable=True)
```

---

## Option C: Enhanced Vendor Management with Audit Trail

### Deactivation with Reason Tracking

**Updated Endpoint**:
```
POST /admin/vendors/{vendor_id}/deactivate?reason="Found selling counterfeit meds"
```

**New Database Fields**:
```python
class Vendor(Base):
    is_active = Column(Boolean, default=True)
    deactivation_reason = Column(String, nullable=True)
    deactivated_by = Column(Integer, FK("users.id"))  # Which admin
    deactivated_at = Column(DateTime, nullable=True)
```

**Result**: Full audit trail of who deactivated what vendor and why.

### Moderation Dashboard

**Endpoint**: `GET /admin/moderation/stats`
```json
{
  "pending_vendors": 5,
  "flagged_vendors": 2,
  "flagged_requests": 12,
  "rejected_vendors": 3
}
```

---

## Security Patterns: Admin-Only Route Guards

### RBAC Pattern (Applied to All Admin Routes)

```python
def get_current_admin(token: dict, db: Session):
    user = get_user_from_token(token, db)
    if user.role != UserRole.ADMIN:
        raise HTTPException(403, "Admin access required")
    return user

@router.post("/moderation/vendors/{id}/verify")
def verify_vendor(..., user: User = Depends(get_current_admin)):
    # Only admins reach here
    ...
```

✅ Applied to:
- All monitoring endpoints (`/stats`, `/moderation/stats`)
- All configuration endpoints (`/scoring-weights`)
- All action endpoints (verify, flag, deactivate, etc.)

---

## Reusable Admin Patterns

### 1. Database-Backed Configuration (FR-406)
```python
# Load config from DB
config = db.query(ScoringConfig).first()

# Update config
config.distance_weight = 0.4
db.commit()

# Use in business logic
weights = ScoringWeights(distance_weight=config.distance_weight, ...)
```
✅ **Enables**: Runtime configuration without code changes
**Reuse**: Any admin-tunable parameter (rate limits, thresholds, etc.)

### 2. Enum-Based Status Workflows
```python
class VendorStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    FLAGGED = "flagged"

# Guard by status
if vendor.status != VendorStatus.PENDING:
    raise HTTPException(400, "Already processed")
```
✅ **Enables**: Multi-state entities with valid transitions
**Reuse**: Requests, resources, campaigns, verifications

### 3. Audit Trail on Actions
```python
vendor.deactivated_by = admin_user.id
vendor.deactivated_at = datetime.utcnow()
vendor.deactivation_reason = "Reason from admin"
```
✅ **Enables**: Compliance, accountability, debugging
**Reuse**: Track modifications to any entity (requests, users, vendors)

### 4. Admin Reason Capture
```python
@router.post("/moderation/vendors/{id}/flag")
def flag_vendor(..., request: VendorVerificationRequest):
    vendor.flag_reason = request.reason  # Capture why
```
✅ **Enables**: Context for review queue, escalation
**Reuse**: Any admin action that needs justification

---

## Database Migration

**Migration File**: `20260411_02_add_admin_moderation_features.py`

**Changes**:
1. Add `ScoringConfig` table (singleton for weights)
2. Add vendor fields: status, verification_reason, flagged, flag_reason, deactivation audit fields
3. Add request fields: flagged, flag_reason
4. Add foreign keys for audit trails

**Rollback Safe**:
- Downgrade removes new tables/columns
- Existing vendor/request data preserved

---

## Implementation Files

**Modified**:
- `backend/models.py` - Added VendorStatus enum, ScoringConfig model, enhanced Vendor/Request
- `backend/routes/admin_routes.py` - Wired scoring config, added moderation endpoints, deactivation tracking
- `backend/routes/requester_routes.py` - Load weights from DB before running AVRE engine
- `backend/schemas.py` - Added moderation request/response schemas

**Created**:
- `backend/alembic/versions/20260411_02_add_admin_moderation_features.py` - Migration

---

## Feature Removal Checklist

If you want to remove/disable these features later:

**Remove FR-406 (Scoring Weights)**:
1. Delete ScoringConfig model from models.py
2. Remove `/admin/scoring-weights` endpoints
3. Revert requester_routes.py to `engine = AVREEngine()` (hardcoded defaults)
4. Run downgrade migration or drop `scoring_config` table manually

**Remove FR-406 (Moderation)**:
1. Delete VendorStatus enum from models.py
2. Remove vendor status/flagging fields
3. Remove `/admin/moderation/*` endpoints
4. Remove moderation response schemas
5. Run downgrade migration

**Remove Option C (Audit Trail)**:
1. Remove deactivation_reason, deactivated_by, deactivated_at from Vendor
2. Simplify deactivate endpoint to just set is_active=false
3. Run downgrade migration

---

## Testing Scenarios

### Scenario 1: Admin Tunes AVRE Weights
```
1. GET /admin/scoring-weights → {distance: 0.35, stock: 0.20, ...}
2. PUT /admin/scoring-weights → {distance: 0.45, stock: 0.15, ...}  (Prioritize distance)
3. User: POST /requests → Requester creates request
4. Verify: GET /requests/{id}/matches → Results use new weights (vendors closer to request rank higher)
```

### Scenario 2: Admin Approves New Vendors
```
1. New vendor signs up → status = PENDING
2. GET /admin/moderation/vendors/pending → [vendor1, vendor2, vendor3]
3. Admin: POST /admin/moderation/vendors/1/verify → status = VERIFIED
4. Vendor1 can now match requests (if needed, add status filter to AVRE)
```

### Scenario 3: Admin Flags Suspicious Vendor
```
1. POST /admin/moderation/vendors/5/flag → reason="Unusual pricing"
2. Vendor5.flagged = true, status = FLAGGED
3. GET /admin/moderation/vendors/pending → Shows flagged vendors for review
4. POST /admin/moderation/vendors/5/verify → Approve after review, status = VERIFIED
5. Or: POST .../5/reject → Reject, is_active = false, status = REJECTED
```

### Scenario 4: Deactivation Audit Trail
```
1. POST /admin/vendors/10/deactivate → reason="Selling expired medicine"
2. Vendor10.is_active = false
3. Vendor10.deactivated_by = admin_id, deactivated_at = now()
4. Vendor10.deactivation_reason = "Selling expired medicine"
5. Audit log accessible for compliance review
```

---

## API Quick Reference

**Stats & Monitoring**:
- `GET /admin/stats` - System-wide stats
- `GET /admin/moderation/stats` - Moderation queue sizes

**Configuration**:
- `GET /admin/scoring-weights` - View current weights
- `PUT /admin/scoring-weights` - Update weights (persisted, wired to engine)

**Vendor Management**:
- `GET /admin/vendors` - List all vendors
- `POST /admin/vendors/{id}/deactivate` - Deactivate with reason
- `POST /admin/vendors/{id}/activate` - Re-activate

**Vendor Moderation**:
- `GET /admin/moderation/vendors/pending` - Pending verification queue
- `POST /admin/moderation/vendors/{id}/verify` - Approve vendor
- `POST /admin/moderation/vendors/{id}/reject` - Reject vendor
- `POST /admin/moderation/vendors/{id}/flag` - Flag for review
- `POST /admin/moderation/vendors/{id}/unflag` - Clear flag

**Request Management**:
- `GET /admin/requests` - List all requests
- `GET /admin/moderation/requests/flagged` - List spam requests
- `POST /admin/moderation/requests/{id}/flag` - Flag as spam
- `POST /admin/moderation/requests/{id}/unflag` - Clear spam flag

**User Management**:
- `GET /admin/users` - List all users
- `DELETE /admin/users/{id}` - Remove user account

---

## Summary

**Admin Module Completeness**: All FR-401 to FR-406 fully implemented:
- ✅ User/vendor/request management and monitoring
- ✅ Scoring weight configuration wired to DB and AVRE engine
- ✅ Vendor verification workflow with status pipeline
- ✅ Vendor/request flagging for moderation
- ✅ Deactivation with audit trail
- ✅ Moderation dashboard stats

**Architecture Benefit**: Reusable patterns for any future admin features (campaigns, verifications, escalations, etc.). All features can be toggled/removed by deleting endpoints and models—clean separation of concerns.

**Migration Strategy**: Option A/B/C can be independently disabled or toggled later without affecting core matching functionality.
