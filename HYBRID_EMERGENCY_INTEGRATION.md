# Hybrid Emergency Resource Intelligence System - Integration Guide

## Overview

This document outlines the integration of the Hybrid Emergency Resource Intelligence System into EmpathI's existing workflows.

## Architecture

```
AI TRIAGE INPUT
    ↓
Intent Analysis (Extends existing LLM)
    ↓
Platform Match Orchestration
├── Vendors & Inventory
├── Campaigns & Relief
├── Volunteers & NGOs
└── Emergency Contacts
    ↓
Nearby Infrastructure Fetch (OSM/Overpass)
├── Hospitals
├── Blood Banks
├── Ambulances
├── Shelters
├── Police/Fire
└── Pharmacies
    ↓
Intelligent Ranking & Prioritization
    ↓
Smart Recommendations + Fallback Strategy
    ↓
UNIFIED MATCH RESULTS
```

## Backend Integration Points

### 1. Enhanced AI TRIAGE Service
**File:** `backend/services/hybrid_emergency_intelligence.py`

**Key Classes:**
- `HybridEmergencyIntelligence` - Main orchestrator
  - `analyze_emergency_intent()` - Intent classification
  - `get_platform_matches()` - Reuses existing matching logic
  - `get_nearby_emergency_resources()` - OSM integration
  - `intelligently_rank_results()` - Smart prioritization
  - `process_intelligent_match()` - Main orchestration
  - `enable_smart_retry()` - Fallback strategy

**Integration Points:**
- Extends existing `llm_service.py` analysis
- Leverages `matching_service.py` for vendor matching
- Uses `overpass_service.py` for OSM data
- Orchestrates multiple existing services

### 2. New API Endpoints
**File:** `backend/api/v1/endpoints/emergency.py`

**Endpoints:**
```
POST /emergency/intelligent-match
- Request: request_id, emergency_query
- Response: Unified results with rankings

POST /emergency/smart-retry
- Request: request_id, expanded_radius, nearby_cities
- Response: Retry guidance with preserved state
```

## Frontend Integration

### 1. Enhanced MatchResults Page
**File:** `frontend/src/pages/MatchResults.jsx`

**Changes:**
- Import and use `HybridEmergencyResults` component
- Display results in priority order:
  1. Immediate Actions (red pulsing cards)
  2. Critical Infrastructure (hospitals, ambulances)
  3. Verified Vendors (with inventory)
  4. Support Resources (campaigns, volunteers)
  5. Alternative Help (contacts, NGOs)
- Add "Nearby Emergency Resources" section
- Add "Smart Retry" options for "No Matches" scenario

### 2. New Component: HybridEmergencyResults
**Path:** `frontend/src/components/emergency/HybridEmergencyResults.jsx`

**Features:**
- Displays unified intelligent matching results
- Lazy-loads nearby resources
- Shows emergency cards with priority badges
- One-tap emergency actions
- Mobile-optimized pulsing animations

### 3. Update CreateRequest Flow
**File:** `frontend/src/pages/CreateRequest.jsx`

**Changes:**
- On emergency request creation, redirect to intelligent match endpoint
- Pass AI TRIAGE analysis to `/matches` with results
- Preserve user query for smart retry

## Data Flow Examples

### Scenario 1: "Need oxygen cylinder urgently near Andheri"

```
INPUT: "Need oxygen cylinder urgently near Andheri"
    ↓
INTENT ANALYSIS:
- intent: "oxygen_need"
- urgency_score: 95
- keywords: ["oxygen", "urgently"]
    ↓
PLATFORM MATCHES:
- Vendors with oxygen inventory: 3
- Campaigns: 1
- Volunteers with medical skills: 2
    ↓
NEARBY RESOURCES (OSM):
- Hospitals: 5
- Pharmacies: 8
- Ambulances: 2
    ↓
INTELLIGENT RANKING:
1. IMMEDIATE: Call 102 (Ambulance)
2. CRITICAL: Nearest hospital (300m)
3. VENDOR: Oxygen supplier (2.1km)
4. SUPPORT: Medical volunteer available
    ↓
RECOMMENDATION:
"🚑 CRITICAL: Nearest hospital located 300m away. 
Calling ambulance recommended. 
3 verified oxygen suppliers found."
```

### Scenario 2: "Need shelter after flooding"

```
INPUT: "Need shelter after flooding"
    ↓
INTENT ANALYSIS:
- intent: "shelter_need"
- urgency_score: 80
- keywords: ["shelter", "flooding"]
    ↓
PLATFORM MATCHES:
- Campaigns (relief): 2
- Volunteers: 5
- NGOs: 3
    ↓
NEARBY RESOURCES (OSM):
- Shelters: 2
- Relief camps: 1
    ↓
INTELLIGENT RANKING:
1. CRITICAL: Nearby shelters (2)
2. SUPPORT: Active relief campaigns
3. VOLUNTEERS: Ready to assist
4. CONTACTS: Disaster relief hotline
    ↓
RECOMMENDATION:
"🏠 HIGH: 2 shelters found nearby. 
2 active relief campaigns. 
5 volunteers available to help."
```

## Smart Retry Logic

When no platform matches are found:

```
NO MATCHES FOUND
    ↓
SMART RETRY OPTIONS:
1. Expand search radius (5km → 10km → 25km)
2. Include nearby cities (Navi Mumbai → Mumbai → Thane)
3. Broaden categories (oxygen → medical supplies)
4. Escalate to emergency mode
    ↓
PRESERVED STATE:
- Original request ID
- User's emergency query
- Location & urgency
- Previous search attempts
    ↓
GUIDED REFINEMENT:
- Suggest broader categories
- Show nearby city options
- Offer emergency escalation
- Display public resources
```

## UI/UX Specifications

### Emergency Result Cards

#### Priority 1: Immediate Actions (Red Pulsing)
```
🚑 CALL AMBULANCE | 102
├── Direct dial button
├── Live location sharing
└── Emergency contact notification

⏱️  Nearest Hospital
├── Distance: 300m
├── Name: Apollo Hospital
├── Phone button
├── Navigation button
└── Wait time estimate
```

#### Priority 2: Critical Infrastructure
```
Cards showing:
- Hospital/Ambulance location
- Distance in km
- Phone number (clickable)
- "Navigate" button
- Verification badge
```

#### Priority 3: Verified Vendors
```
Existing vendor cards with:
- Priority badge
- Distance highlight
- Inventory status
- Quick call/chat buttons
```

#### Priority 4: Support Resources
```
Campaign cards (existing)
Volunteer cards (existing)
NGO cards
Relief organization info
```

#### Priority 5: Alternative Help
```
Helpline cards:
- Emergency contacts
- NGO hotlines
- Disaster relief lines
- Community support
```

### Mobile Optimizations
- Sticky emergency action button at top
- Swipeable card carousel for nearby resources
- One-tap calling
- Full-screen map integration
- Collapsible sections

## API Response Format

```json
{
  "success": true,
  "intent": "medical_emergency",
  "urgency_score": 95,
  "recommended_action": "🚑 CRITICAL: Seek immediate medical assistance",
  "has_platform_matches": true,
  "has_nearby_resources": true,
  "results": {
    "immediate_actions": [
      {
        "action": "Call Ambulance",
        "phone": "102",
        "priority": 1
      }
    ],
    "critical_infrastructure": [
      {
        "id": "hospital_1",
        "name": "Apollo Hospital",
        "distance_km": 0.3,
        "phone": "9876543210",
        "type": "hospital"
      }
    ],
    "verified_vendors": [
      {
        "id": "vendor_1",
        "name": "Medical Supplies Co",
        "distance_km": 2.1,
        "match_score": 0.95,
        "has_inventory": true
      }
    ],
    "support_resources": [...],
    "alternative_help": [...],
    "nearby_resources": {
      "hospitals": [...],
      "blood_banks": [...],
      "ambulances": [...],
      "shelters": [...]
    }
  }
}
```

## Implementation Checklist

### Backend
- [x] Create `hybrid_emergency_intelligence.py` service
- [x] Add `/emergency/intelligent-match` endpoint
- [x] Add `/emergency/smart-retry` endpoint
- [ ] Test intelligent matching with various scenarios
- [ ] Verify OSM integration
- [ ] Load test with concurrent requests

### Frontend
- [ ] Update `MatchResults.jsx` to use intelligent matching
- [ ] Create `HybridEmergencyResults` component
- [ ] Add smart retry dialog component
- [ ] Update `CreateRequest.jsx` flow
- [ ] Add nearby resources map view
- [ ] Implement mobile optimizations
- [ ] Test emergency card animations
- [ ] Test one-tap calling

### Testing
- [ ] Unit tests for intent classification
- [ ] Integration tests for platform matches
- [ ] E2E tests for full emergency flow
- [ ] Performance tests (latency < 2s)
- [ ] OSM/Overpass API reliability
- [ ] Mobile device testing
- [ ] Accessibility testing

### Deployment
- [ ] Update API documentation
- [ ] Create database migrations if needed
- [ ] Add monitoring for new endpoints
- [ ] Set up error tracking
- [ ] Monitor OSM API usage
- [ ] Add feature flag for gradual rollout
- [ ] Document for ops team

## Reused Components & Patterns

### Existing Components to Leverage
- `MatchResults.jsx` layout
- Vendor cards (existing)
- Campaign cards (existing)
- Volunteer cards (existing)
- Emergency action buttons
- Map components

### Existing Services to Reuse
- `matching_service.py` - vendor matching
- `inventory_service.py` - product lookup
- `campaign_service.py` - campaign search
- `emergency_service.py` - helplines
- `overpass_service.py` - nearby resources
- `llm_service.py` - AI triage

### Existing APIs to Reuse
- `/matches/incoming` - existing matching
- `/inventory` - product search
- `/campaigns` - campaign discovery
- `/emergency/helplines` - contacts
- `/emergency-map/nearby` - OSM resources

## Future Enhancements

1. **AI-Powered Recommendations**
   - Learn from user actions
   - Improve intent classification
   - Personalize results

2. **Real-time Updates**
   - WebSocket for live volunteer tracking
   - Real-time ambulance ETA
   - Hospital availability status

3. **Community Features**
   - Peer-to-peer emergency help
   - Community volunteers
   - Neighbor alert system

4. **Advanced Analytics**
   - Emergency hotspot mapping
   - Resource gap analysis
   - Intervention opportunities

5. **Integration with External APIs**
   - Google Maps for directions
   - Hospital APIs for bed availability
   - Blood bank inventory systems
   - Weather APIs for disaster prediction

## Support & Troubleshooting

### Common Issues

1. **OSM/Overpass timeout**
   - Solution: Implement retry logic with fallback
   - Current: 15s timeout, returns empty on failure

2. **No nearby resources found**
   - Solution: Smart retry with expanded radius
   - Provides guidance for user refinement

3. **Multiple intents in query**
   - Solution: Classify primary intent first
   - Future: Multi-intent support

## Contact & Questions

For implementation support or questions:
- Review `hybrid_emergency_intelligence.py` service
- Check API response formats
- Test with real emergency scenarios
