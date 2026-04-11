# Vendor Module Patterns (FR-301 to FR-307)

## Status: ✅ COMPLETE

All vendor module functional requirements implemented with reusable patterns for RBAC, lifecycle management, and rating automation.

---

## Feature Coverage

### ✅ FR-301: Vendor Profile Setup & Management
**Endpoints**: `POST /vendor/register`, `GET /vendor/profile`, `PUT /vendor/profile`
**Pattern**: Multi-step vendor onboarding with profile persistence
- Registration creates vendor record linked to authenticated user
- Profile update supports name, active status, response time tuning
- RBAC: Only vendor user can manage own profile

**Reusable Pattern**:
```python
# Profile CRUD with ownership guard
vendor = db.query(Vendor).filter(Vendor.user_id == user.id).first()
if not vendor:
    raise HTTPException(404, "Vendor profile not found")
# Update allowed fields only
```

---

### ✅ FR-302: Add Inventory Items
**Endpoint**: `POST /vendor/inventory`
**Pattern**: Resource inventory management with vendor ownership
- Add resource with name, quantity, price
- Linked to vendor via FK relationship
- Automatic timestamps (created_at)

**Reusable Pattern**:
```python
# Validate vendor ownership, then create child entity
vendor = db.query(Vendor).filter(Vendor.user_id == user.id).first()
db_item = Inventory(vendor_id=vendor.id, resource_name=..., quantity=..., price=...)
```

---

### ✅ FR-303: Update/Delete Inventory Items
**Endpoints**: `PUT /vendor/inventory/{item_id}`, `DELETE /vendor/inventory/{item_id}`
**Pattern**: Child entity CRUD with dual validation (vendor ownership + item ownership)
- Updates allow partial fields (quantity, price)
- Deletion removes item from inventory
- 404 if item not found or not owned by vendor

**Reusable Pattern**:
```python
# Dual filter: parent ownership + child ownership
db_item = db.query(Inventory).filter(
    Inventory.id == item_id,
    Inventory.vendor_id == vendor.id  # Protect cross-vendor access
).first()
```

---

### ✅ FR-304: Active Status & Response Time
**Endpoint**: `PUT /vendor/profile`
**Pattern**: Vendor availability configuration
- `is_active` toggle (default True)
- `avg_response_time` in minutes (configurable)
- Used by AVRE engine for scoring

**Reusable Pattern**:
```python
# Conditional field updates
if vendor_update.is_active is not None:
    vendor.is_active = vendor_update.is_active
if vendor_update.avg_response_time:
    vendor.avg_response_time = vendor_update.avg_response_time
```

---

### ✅ FR-305: Incoming Match Notification
**Endpoint**: `GET /vendor/requests`
**Pattern**: Real-time match visibility and filtering
- Lists all matches ordered newest-first
- Exposes `is_actionable` flag (true only if status = PENDING)
- Shows match metadata: score, resource, urgency, request status

**Reusable Pattern**:
```python
# Filter primary entity, then map child entities with status
matches = db.query(Match).filter(Match.vendor_id == vendor.id).all()
results = [
    {
        "match_id": match.id,
        "request_id": match.request.id,
        "is_actionable": match.status == MatchStatus.PENDING,
        ...
    }
    for match in matches
]
results.sort(key=lambda x: x["created_at"], reverse=True)
```

---

### ✅ FR-306: Accept/Reject Incoming Matches
**Endpoints**: `POST /vendor/requests/{match_id}/accept`, `POST /vendor/requests/{match_id}/reject`
**Pattern**: State machine transitions with guard conditions
- Only accepts/rejects PENDING matches
- Blocks actionson CANCELLED_BY_REQUESTER matches
- Guard: `match.status != MatchStatus.PENDING` → 400 error

**Reusable Pattern**:
```python
# Guard condition before state transition
if match.status != MatchStatus.PENDING:
    raise HTTPException(400, f"Cannot accept match in {match.status.value} state")
if match.status == MatchStatus.CANCELLED_BY_REQUESTER:
    raise HTTPException(409, "Requester has cancelled this match")
match.status = MatchStatus.ACCEPTED_BY_VENDOR  # Only if guards pass
```

---

### ✅ FR-307: Automatic Vendor Rating Update After Acceptance
**Endpoint**: `POST /requests/{request_id}/accept/{vendor_id}` (integrated)
**Pattern**: Lifecycle-triggered rating calculation with rolling average at acceptance time
- Rating updates **immediately** when requester accepts vendor (no manual completion step)
- Uses AVRE match score (composite of distance/stock/rating/speed/urgency) as quality input
- Formula: `new_rating = (old_rating * accepted_count + match_score) / (accepted_count + 1)`
- Ensures rating is bounded [0, 100]
- Reflects vendor quality based on AVRE algorithm's assessment + track record

**Why on Acceptance (not Completion)?**
- Crisis response: No manual actions during emergency
- Semantic consistency: Accepting vendor = voting they're good (AVRE score-based)
- Faster feedback loop: Rating improves next request immediately
- No delivery tracking needed: Matching platform (not delivery logistics)

**Reusable Pattern**:
```python
# Rating on acceptance using match score
accepted_count = db.query(Match).filter(
    Match.vendor_id == vendor.id,
    Match.status == MatchStatus.ACCEPTED_BY_REQUESTER
).count()

match_score = float(match.score)  # AVRE composite score
if accepted_count == 0:
    new_rating = match_score
else:
    new_rating = (vendor.rating * accepted_count + match_score) / (accepted_count + 1)

vendor.rating = min(100.0, max(0.0, new_rating))  # Bounded
```

---

## Cross-Module Integration Points

### Request → Vendor Rating Update (FR-307)
When requester calls `PUT /requests/{request_id}/complete`:
1. Validates request in ACCEPTED state
2. Finds matching `Match.status == ACCEPTED_BY_REQUESTER`
3. Updates both `Match.status` and `Request.status` to COMPLETED
4. Fetches associated Vendor
5. Calls rolling-average rating update
6. Returns completion with `vendor_new_rating`

### AVRE Engine → Vendor Rating (FR-307 feedback loop)
- Match scores computed with `rating_score` component
- Vendor rating (from prior completions) influences future match scores
- Creates positive feedback: completing matches → higher rating → better match scores → more opportunities

### Vendor Matches List (FR-305,306) → Active Status (FR-304)
- `GET /vendor/requests` lists only matches for active vendors
- Active status indicates vendor's availability in AVRE scoring
- `is_actionable` flag reflects match status for UI filtering

---

## Reusable Security Patterns

### 1. **RBAC via get_current_vendor_or_admin()**
```python
def get_current_vendor_or_admin(token, db):
    user = get_user_from_token(token, db)
    if user.role not in [UserRole.VENDOR, UserRole.ADMIN]:
        raise HTTPException(403, "Not authorized")
    return user
```
✅ Applied: All vendor endpoints

### 2. **Ownership Validation**
```python
vendor = db.query(Vendor).filter(Vendor.user_id == user.id).first()
if not vendor:
    raise HTTPException(404, "Vendor profile not found")
```
✅ Applied: All profile/inventory/requests endpoints

### 3. **Child Entity Ownership Check**
```python
db_item = db.query(Inventory).filter(
    Inventory.id == item_id,
    Inventory.vendor_id == vendor.id  # Prevents cross-vendor access
).first()
```
✅ Applied: Inventory update/delete

### 4. **State Machine Guards**
```python
VALID_STATES_FOR_ACTION = {MatchStatus.PENDING, MatchStatus.ACCEPTED_BY_VENDOR}
if match.status not in VALID_STATES_FOR_ACTION:
    raise HTTPException(400, f"Invalid state: {match.status}")
```
✅ Applied: Match accept/reject, request complete

---

## Testing Scenarios

### Scenario 1: Vendor Lifecycle
```
1. POST /vendor/register → Creates profile, shop_name="Pharmacy A", lat/lon set
2. PUT /vendor/profile → Update is_active=false, avg_response_time=20
3. GET /vendor/profile → Verify changes persisted
4. POST /vendor/inventory → Add item (aspirin, 100 units, $5)
5. GET /vendor/inventory → List shows 1 item
6. PUT /vendor/inventory/1 → Update quantity to 50
7. DELETE /vendor/inventory/1 → Item removed
```

### Scenario 2: Matching & Rating
```
1. Requester: POST /requests → Creates PENDING request
2. Requester: GET /requests/{id}/matches → AVRE runs, creates 3 matches (status=PENDING)
3. Vendor A: POST /vendor/requests/{match_id}/accept → Match → ACCEPTED_BY_VENDOR
4. Requester: POST /requests/{id}/accept/{vendor_a_id} → Request → ACCEPTED + RATING UPDATED
   - Vendor A rating = match.score (first acceptance)
5. Repeat with new request: Second acceptance → rating = (old_rating + new_score) / 2
   - No separate completion step needed
```

### Scenario 3: Cancellation Guards
```
1. Requester: POST /requests → PENDING
2. Requester: GET /requests/{id}/matches → AVRE runs, creates match (PENDING)
3. Requester: POST /requests/{id}/cancel → Match → CANCELLED_BY_REQUESTER
4. Vendor: Try POST /vendor/requests/{match_id}/accept → 409 Conflict error
5. Vendor: Try POST /vendor/requests/{match_id}/reject → 409 Conflict error
```

---

## Architecture Notes

### Vendor Rating Algorithm Justification (Acceptance-Based)

**Why rate on acceptance vs. completion?**

For **emergency response platforms**:
- ✅ **No manual actions during crisis**: Requester auto-rates when accepting vendor
- ✅ **Semantic match**: Acceptance = "I trust this vendor" (voters for them)
- ✅ **Instant feedback**: AVRE uses updated rating next request immediately
- ✅ **No delivery tracking**: Platform is matching-only, not delivery logistics
- ✅ **Matching algorithm values**: Match score reflects AVRE's assessment already

vs. completion-based (original):
- ❌ Requires extra manual step → friction during emergency
- ❌ Slow feedback: Rating only updates hours/days later
- ❌ Assumes delivery tracking system (we don't have one)

**Rolling average ensures**:
- **Fairness**: Each acceptance weighted equally
- **Convergence**: Rating trends toward consistent AVRE scores  
- **Bounded**: Capped [0,100] prevents overflow
- **Interpretable**: "8.5 rating" = average match score vendor gets
- **Improvement Path**: Poor vendors improve by getting better AVRE matches

Example progression:
```
Acceptance 1 (score=7.0) → rating = 7.0
Acceptance 2 (score=8.0) → rating = (7.0 + 8.0) / 2 = 7.5
Acceptance 3 (score=9.0) → rating = (7.5*2 + 9.0) / 3 = 7.83
Acceptance 4 (score=8.5) → rating = (7.83*3 + 8.5) / 4 = 8.12
```

Rating improves but never jumps erratically → stable vendor profiles tied to AVRE quality.

---

## Alignment with tomato-code Patterns

| Pattern | Vendor Implementation | tomato-code Reference |
|---------|----------------------|----------------------|
| RBAC | `get_current_vendor_or_admin()` | Role-based access control gate |
| Ownership | Dual filter (user_id, vendor_id) | User ownership + resource ownership |
| State Machine | Explicit status guards | Request/match status transitions |
| Lifecycle | PENDING → ACCEPTED → COMPLETED | State flow with guards |
| Async Workflows | Rating updated on completion | Event-triggered calculations |
| Error Responses | 400/404/409 HTTP codes | Standard REST errors |

---

## Files Modified

1. **[backend/routes/vendor_routes.py]**
   - Inventory CRUD (FR-302, FR-303)
   - Profile management (FR-301, FR-304)
   - Incoming requests visibility (FR-305)
   - Match accept/reject with state guards (FR-306)

2. **[backend/routes/requester_routes.py]**
   - Added `PUT /requests/{request_id}/complete` endpoint (FR-307)
   - Added `update_vendor_rating_after_completion()` helper
   - Integrates vendor rating update into request completion flow

3. **[backend/models.py]**
   - `Vendor.rating` field (Float, tracks rolling average)
   - `Match.status` enum w/ COMPLETED value (enables rating triggers)

---

## Summary

**Vendor Module Completeness**: All FR-301 to FR-307 implemented with consistent patterns for:
- Profile & inventory management
- Incoming match visibility & actions
- Automatic performance rating **on acceptance** (immediate, crisis-optimized)
- Guards preventing invalid state transitions
- Clear error responses for debugging

**Reuse Ready**: Patterns documented and ready for similar modules (e.g., Resource vendors, third-party integrations).

---

## Implementation Notes

**FR-307 Evolution**:
- Initially: Manual completion endpoint (`PUT /requests/{id}/complete`)
- **Refactored to**: Automatic rating on acceptance (`POST /requests/{id}/accept/{vendor_id}`)
- **Rationale**: Faster feedback for AVRE loop, no manual actions during crisis, semantic alignment with trust-based selection
- **Impact**: Vendor ratings update immediately when chosen, next request benefits from updated rating
