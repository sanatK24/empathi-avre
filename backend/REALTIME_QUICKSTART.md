# Real-Time Notifications - Quick Start Guide

## Architecture Summary

✅ **Implemented Phase 7 Components**:

| Component | File | Status | Purpose |
|-----------|------|--------|---------|
| Connection Manager | `realtime.py` | ✅ Complete | Track WebSocket connections in rooms |
| Event Emitter | `realtime.py` | ✅ Complete | Publish events to RabbitMQ |
| Event Schemas | `events.py` | ✅ Complete | 10 event types + payload models |
| Event Consumer | `event_consumer.py` | ✅ Complete | Background task consuming from RabbitMQ |
| WebSocket Endpoint | `main.py` | ✅ Complete | `/ws/{user_id}/{room_type}/{room_id}` |
| Event Emissions | All routes | ✅ Complete | Wired into requester/vendor/admin routes |

## Quick Event Flow

### 1. Vendor Gets Matched
```
Requester → GET /requests/1/matches
           ↓
Requester_routes → emit_and_broadcast(VENDOR_MATCHED, ...)
           ↓
emit_and_broadcast → Publish to RabbitMQ + broadcast to vendor:42
           ↓
Vendor (connected to ws://localhost:8000/ws/user456/vendor/42) → Receives event
```

### 2. Vendor Accepts Match
```
Vendor → POST /vendor/requests/1/accept
       ↓
Vendor_routes → emit_and_broadcast(MATCH_ACCEPTED_BY_VENDOR, ...)
       ↓
Requester (connected to ws://localhost:8000/ws/user123/requester/user123) → Receives event
```

### 3. Admin Flags Vendor
```
Admin → POST /admin/moderation/vendors/42/flag
      ↓
Admin_routes → emit_and_broadcast(VENDOR_FLAGGED, ...)
      ↓
Vendor (vendor:42) + Admin (admin) rooms → Receive event
```

## Room Types

| Room | Notifications | Example Connection |
|------|---------------|-------------------|
| `vendor:{id}` | Match opportunities, ratings, moderation actions | `ws://...../ws/user456/vendor/42` |
| `requester:{id}` | Vendor acceptance/rejection | `ws://...../ws/user123/requester/123` |
| `admins` | Moderation events, vendor flags | `ws://...../ws/admin_user/admin/dashboard` |

## Event Types Emitted

| Event | Trigger | Affected Rooms | Use Case |
|-------|---------|----------------|----------|
| `vendor.matched` | Requester gets matches | `vendor:{id}` | Notify vendor of opportunity |
| `match.accepted_by_vendor` | Vendor accepts match | `requester:{id}` | Notify requester vendor confirmed |
| `match.rejected_by_vendor` | Vendor rejects match | `requester:{id}` | Notify requester vendor declined |
| `match.accepted_by_requester` | Requester selects vendor | `vendor:{id}`, `admins` | Confirm deal for vendor, track for admin |
| `match.cancelled` | Requester cancels request | `vendor:{id}` (affected list) | Notify vendors opportunity closed |
| `vendor.verified` | Admin verifies vendor | `vendor:{id}`, `admins` | Notify vendor of approval, admin dashboard |
| `vendor.rejected` | Admin rejects vendor | `vendor:{id}`, `admins` | Notify vendor of rejection |
| `vendor.flagged` | Admin flags vendor | `vendor:{id}`, `admins` | Alert vendor of review flag |
| `vendor.rating_updated` | Vendor rating changes | `vendor:{id}`, `admins` | Notify vendor of new rating |
| `request.flagged` | Admin flags request | `admins` | Alert admins of spam |

## Frontend Integration Pattern

### Vue/React Hook Example
```javascript
// Connect to WebSocket
const connectWebSocket = (userId, roomType, roomId) => {
  const ws = new WebSocket(
    `ws://localhost:8000/ws/${userId}/${roomType}/${roomId}`
  );
  
  ws.onmessage = (event) => {
    const { event_type, data, timestamp } = JSON.parse(event.data);
    
    switch(event_type) {
      case 'vendor.matched':
        // Show notification: "New opportunity: Water (50L, Urgent)"
        showNotification(`New Match: ${data.resource_name}`);
        break;
      
      case 'match.accepted_by_vendor':
        // Update match status: "Vendor confirmed - Water (50L)"
        updateMatchStatus(data.match_id, 'VENDOR_CONFIRMED');
        break;
      
      case 'match.rejected_by_vendor':
        // Update match: "Vendor declined"
        updateMatchStatus(data.match_id, 'VENDOR_REJECTED');
        break;
      
      // ... other event handlers
    }
  };
  
  ws.onerror = (err) => console.error('WebSocket error:', err);
  ws.onclose = () => console.log('Disconnected from real-time updates');
};
```

## Testing

### 1. Test with curl (WebSocket echo)
```bash
# Terminal 1: Connect as vendor
wscat -c ws://localhost:8000/ws/vendor123/vendor/vendor42

# Terminal 2: Create a match (should see vendor.matched)
curl -X GET http://localhost:8000/requests/1/matches
```

### 2. Test with Python
```python
import asyncio
from backend.realtime import emit_and_broadcast
from backend.events import EventType

async def test():
    await emit_and_broadcast(
        EventType.VENDOR_MATCHED,
        {
            "vendor_id": 42,
            "request_id": 1,
            "resource_name": "Water",
            "urgency": "URGENT",
            "match_score": 92.5
        }
    )

asyncio.run(test())
```

## Environment Setup

### .env file (backend root)
```env
# RabbitMQ Configuration
RABBITMQ_URL=amqp://guest:guest@localhost/
ENABLE_RABBITMQ=true
WEBSOCKET_PORT=8001
```

### Installation
```bash
# Install dependencies (already in requirements.txt)
pip install websockets aio-pika python-dotenv

# Start RabbitMQ (Docker)
docker run -d --name rabbitmq \
  -p 5672:5672 -p 15672:15672 \
  rabbitmq:4-management

# Start backend
cd backend
python -m uvicorn main:app --reload
```

## Fallback Behavior

If RabbitMQ is unavailable:
- ✅ WebSocket connections still work
- ✅ Events broadcast immediately to connected clients
- ❌ No persistence/replay (events lost on disconnect)
- ↩️ Consumer falls back gracefully

## Monitoring

### Check Active Connections
```bash
# HTTP endpoint (add to admin_routes.py for production)
curl http://localhost:8000/admin/active-rooms
# Returns: {"vendor:42": 3, "requester:123": 1, "admins": 2}
```

### Monitor RabbitMQ
```bash
# View queues
docker exec rabbitmq rabbitmqctl list_queues

# View exchanges
docker exec rabbitmq rabbitmqctl list_exchanges

# View bindings
docker exec rabbitmq rabbitmqctl list_bindings
```

## Production Checklist

- [ ] Configure RabbitMQ with persistent storage
- [ ] Enable TLS for RabbitMQ AMQP connection
- [ ] Set up RabbitMQ cluster for HA
- [ ] Switch ConnectionManager to Redis for multi-server
- [ ] Add client acknowledgment for guaranteed delivery
- [ ] Implement event versioning for forward compatibility
- [ ] Set up monitoring/alerting on connection/event metrics
- [ ] Test failover: RabbitMQ restart while clients connected
- [ ] Implement exponential backoff for client reconnection
- [ ] Add WebSocket security headers (CORS, origin validation)

## Troubleshooting

| Symptom | Diagnosis | Solution |
|---------|-----------|----------|
| "connection refused" on `ws://` | Server not running | Start backend with `uvicorn` |
| "ValueError: room_id not in format" | Wrong room format | Use `vendor:42`, `requester:123`, or `admin` |
| Events not received | Not connected to correct room | Vendor connects to `vendor:{their_id}`, requester to `requester:{their_id}` |
| "aio_pika" import error | Dependency not installed | `pip install aio-pika` |
| High CPU/memory usage | Connections not closing | Check WebSocketDisconnect handler |
| RabbitMQ queue grows | Consumer not processing | Restart consumer or check event_consumer.py logs |

## Architecture Decisions

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| **Async Tasks** (`asyncio.create_task`) | Non-blocking HTTP response | Event emission best-effort (not guaranteed) |
| **TOPIC exchange** | Flexible routing patterns | Slight overhead vs direct queues |
| **In-memory ConnectionManager** | Fast lookups | Only works single-server (Redis needed for scale) |
| **WebSocket no authentication** | Simpler testing | Must secure with origin/CORS in production |
| **Room-based isolation** | Simplifies broadcasting | Doesn't support complex query filters (future feature) |

---

**Last Updated**: 2025-01-15
**Status**: Ready for frontend integration
**Next**: Frontend WebSocket client, deployment guide
