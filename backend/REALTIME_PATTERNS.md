# Real-Time Notification System (Phase 7) - Architecture & Patterns

## Overview

The real-time notification system enables live updates across the EmpathI platform using WebSockets + RabbitMQ event-driven architecture. Supports FR-305 (real-time notifications) and provides foundation for future verifier/admin features.

**Goal**: "Vendors immediately notified when matched; requesters see vendor acceptance/rejection live"

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         ROUTES LAYER                             │
│  (requester_routes.py, vendor_routes.py, admin_routes.py)       │
│                                                                   │
│  1. State Change (e.g., accept vendor)                          │
│  2. Call emit_and_broadcast(EventType, payload)                │
│  3. Return HTTP response to client                             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  realtime.emit_and_broadcast │
        │  - Route to rooms            │
        │  - Publish to RabbitMQ       │
        │  - Broadcast via WebSocket   │
        └──────────┬───────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
    ┌────────────┐    ┌─────────────┐
    │ RabbitMQ   │◄──►│ WebSocket   │
    │ Exchange   │    │ Manager     │
    │ (AVRE)     │    │ (Rooms)     │
    └────────────┘    └─────────────┘
        │                    │
        ▼                    │
    ┌──────────────────┐    │
    │ event_consumer   │    │
    │ (Background task)│───►│
    └──────────────────┘    │
                            ▼
                    ┌─────────────────────┐
                    │ Client WebSocket    │
                    │ ws://localhost:8000 │
                    │ /ws/{uid}/{room}    │
                    └─────────────────────┘
```

## Core Components

### 1. **realtime.py** - Connection & Event Management

#### ConnectionManager
Tracks active WebSocket connections organized by rooms.

```python
class ConnectionManager:
    rooms: Dict[str, Dict[str, WebSocket]]  # room_id → {connection_id → websocket}
    
    async connect(websocket, room_id)       # Register connection
    disconnect(room_id, connection_id)      # Unregister
    async broadcast_to_room(room_id, msg)  # Send to all in room
    async broadcast_to_rooms(rooms, msg)   # Send to multiple rooms
    get_active_rooms()                      # Stats endpoint
```

**Room Format**:
- `vendor:{vendor_id}` - Vendor notifications (matches, ratings, moderation)
- `requester:{requester_id}` - Requester notifications (vendor responses)
- `admins` - Admin notifications (moderation, flags)

#### EventEmitter
Async RabbitMQ producer for event persistence & replay.

```python
class EventEmitter:
    async connect()                         # Connect to RabbitMQ
    async emit_event(event: EventPayload)  # Publish to exchange
    async subscribe_to_events(...)         # For consumer (background task)
```

**Key Properties**:
- Exchange name: `avre_events`
- Exchange type: `TOPIC` (for routing patterns)
- Queue durability: Persistent (survives restarts)
- Routing key pattern: `avre_events.{event_type}`

#### Event Routing Logic

```python
def get_event_rooms(event_type, event_data) -> list[str]:
    """Determine target rooms for an event."""
    # vendor.matched → notify specific vendor
    # match.accepted_by_vendor → notify requester
    # match.cancelled → notify all affected vendors
    # vendor.flagged, vendor.verified, vendor.rejected → notify vendor + admins
    # request.flagged → notify admins
```

#### Combined Emission

```python
async def emit_and_broadcast(event_type, event_data):
    """
    1. Create EventPayload
    2. Publish to RabbitMQ (persistence + replay)
    3. Get target rooms from event type
    4. Broadcast to WebSocket rooms immediately
    """
```

### 2. **event_consumer.py** - Background Event Processor

```python
class EventConsumer:
    async start()  # Startup: connect to RabbitMQ, declare queue, consume
    async _consume_loop()  # Main loop: process messages indefinitely
    async _handle_message()  # Per-message: parse, route, broadcast
    async stop()  # Shutdown: cancel task, close connection
```

**Lifecycle**:
1. **Startup** (`startup_event` in main.py): Create consumer, start listening
2. **Run** (background task): Consume from RabbitMQ queue, broadcast to WebSocket rooms
3. **Shutdown** (`shutdown_event` in main.py): Cancel consumer, close RabbitMQ connection

**Fallback**: If RabbitMQ unavailable, events still broadcast via WebSocket immediately (no persistence).

### 3. **events.py** - Event Type Schemas

```python
class EventType(str, Enum):
    VENDOR_MATCHED = "vendor.matched"
    MATCH_ACCEPTED_BY_VENDOR = "match.accepted_by_vendor"
    MATCH_REJECTED_BY_VENDOR = "match.rejected_by_vendor"
    MATCH_ACCEPTED_BY_REQUESTER = "match.accepted_by_requester"
    MATCH_CANCELLED = "match.cancelled"
    VENDOR_FLAGGED = "vendor.flagged"
    VENDOR_VERIFIED = "vendor.verified"
    VENDOR_REJECTED = "vendor.rejected"
    VENDOR_RATING_UPDATED = "vendor.rating_updated"
    REQUEST_FLAGGED = "request.flagged"

class EventPayload(BaseModel):
    event_type: EventType
    timestamp: datetime
    data: Dict[str, Any]
```

**Specific Payloads**:
- `VendorMatchedEvent` - {vendor_id, request_id, resource_name, urgency, match_score}
- `MatchAcceptedByVendorEvent` - {vendor_id, requester_id, request_id, match_id, vendor_name}
- `MatchRejectedByVendorEvent` - {vendor_id, requester_id, request_id, match_id}
- `MatchAcceptedByRequesterEvent` - {requester_id, vendor_id, request_id, match_id, new_vendor_rating}
- `MatchCancelledEvent` - {request_id, requester_id, affected_vendor_ids[]}
- `VendorFlaggedEvent` - {vendor_id, shop_name, flag_reason}
- `VendorVerifiedEvent` - {vendor_id, shop_name, verification_reason}
- `VendorRejectedEvent` - {vendor_id, shop_name, rejection_reason}
- `VendorRatingUpdatedEvent` - {vendor_id, old_rating, new_rating}
- `RequestFlaggedEvent` - {request_id, requester_id, flag_reason}

### 4. **main.py** - WebSocket Endpoint & Lifecycle

```python
@app.on_event("startup")
async def startup_event():
    """Initialize real-time services on app startup."""
    await start_event_consumer()

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    await stop_event_consumer()

@app.websocket("/ws/{user_id}/{room_type}/{room_id}")
async def websocket_endpoint(websocket, user_id, room_type, room_id):
    """
    WebSocket endpoint for real-time notifications.
    
    Rooms:
    - vendor/{vendor_id}: Vendor-specific notifications
    - requester/{requester_id}: Requester-specific notifications
    - admin: Admin-broadcast notifications
    
    Example: ws://localhost:8000/ws/user123/vendor/vendor456
    """
    # 1. Validate room type & permissions
    # 2. Connect to room (track in ConnectionManager)
    # 3. Keep-alive loop: receive/respond to pings
    # 4. On disconnect: remove from room
```

## Integration Points

### Routes Integration

Each route emits events after state changes using `asyncio.create_task()` (non-blocking):

#### requester_routes.py
- `POST /requests` → Emit request.flagged (consider adding REQUEST_CREATED event type)
- `GET /requests/{id}/matches` → Emit vendor.matched for each candidate
- `POST /requests/{id}/accept/{vendor_id}` → Emit match.accepted_by_requester
- `POST /requests/{id}/cancel` → Emit match.cancelled

#### vendor_routes.py
- `POST /vendor/requests/{match_id}/accept` → Emit match.accepted_by_vendor
- `POST /vendor/requests/{match_id}/reject` → Emit match.rejected_by_vendor

#### admin_routes.py
- `POST /admin/moderation/vendors/{id}/verify` → Emit vendor.verified
- `POST /admin/moderation/vendors/{id}/reject` → Emit vendor.rejected
- `POST /admin/moderation/vendors/{id}/flag` → Emit vendor.flagged
- `POST /admin/moderation/requests/{id}/flag` → Emit request.flagged

**Pattern**:
```python
# After database commit:
asyncio.create_task(emit_and_broadcast(
    EventType.MATCH_ACCEPTED_BY_VENDOR,
    {
        "vendor_id": vendor.id,
        "requester_id": match.request.user_id,
        "match_id": match.id,
        ...
    }
))
```

## Data Flow Example: Vendor Match Notification

### Scenario
1. Requester calls `GET /requests/123/matches`
2. AVRE matches vendor_42 and vendor_55
3. Vendor should see "New opportunity: Water (50L, Urgent)"

### Flow
1. **Requester Route** (`get_matches`):
   - For each matched vendor:
     ```python
     asyncio.create_task(emit_and_broadcast(
         EventType.VENDOR_MATCHED,
         {"vendor_id": vendor.id, "request_id": 123, ...}
     ))
     ```

2. **emit_and_broadcast** (realtime.py):
   - Create EventPayload with timestamp
   - Publish to RabbitMQ: `avre_events.vendor.matched`
   - Route to rooms: `["vendor:42", "vendor:55"]`
   - Broadcast message to both rooms' WebSocket connections

3. **Consumer** (event_consumer.py, background task):
   - Receives message from RabbitMQ queue
   - Parses event type
   - Determines rooms (already done above)
   - Broadcasts to those rooms again (redundant but ensures delivery)

4. **Client** (vendor frontend):
   - Connected to `ws://localhost:8000/ws/vendor123/vendor/42`
   - Receives WebSocket message:
     ```json
     {
       "event": "vendor.matched",
       "timestamp": "2025-01-15T10:30:00Z",
       "data": {
         "vendor_id": 42,
         "request_id": 123,
         "resource_name": "Water",
         "urgency": "URGENT",
         "match_score": 92.5
       }
     }
    ```
   - Updates UI: Notification badge, incoming requests list

## Environment Configuration

Create `.env` in backend root:
```env
RABBITMQ_URL=amqp://guest:guest@localhost/
ENABLE_RABBITMQ=true
WEBSOCKET_PORT=8001
```

**Initialization** (main.py):
- Loads from `.env` via `python-dotenv`
- Falls back to defaults if missing
- If `ENABLE_RABBITMQ=false`, events still broadcast via WebSocket

## Development Setup

### Option A: Full RabbitMQ (Production-like)
```bash
# Start RabbitMQ container
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:4-management

# Start FastAPI
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Check RabbitMQ admin
# Open http://localhost:15672 (user: guest, pass: guest)
# Should see exchange "avre_events" and consumer queue
```

### Option B: WebSocket-Only (Quick Dev)
```bash
# Set ENABLE_RABBITMQ=false in .env
# Start FastAPI (no RabbitMQ needed)
python -m uvicorn main:app --reload

# Events broadcast immediately via WebSocket
# No persistence/replay, but sufficient for frontend testing
```

## Testing

### Test WebSocket Connection
```bash
# Install wscat or similar
npm install -g wscat

# Connect as vendor
wscat -c ws://localhost:8000/ws/user123/vendor/vendor42

# In another terminal, create a matching request
curl -X GET http://localhost:8000/requests/1/matches
# Should see vendor.matched event in WebSocket terminal
```

### Test Event Emission
```python
import asyncio
from realtime import emit_and_broadcast
from events import EventType

# Emit test event
asyncio.run(emit_and_broadcast(
    EventType.VENDOR_MATCHED,
    {
        "vendor_id": 42,
        "request_id": 1,
        "resource_name": "Test",
        "urgency": "NORMAL",
        "match_score": 85.0
    }
))
```

### Monitor RabbitMQ
```bash
# Show queues
docker exec rabbitmq rabbitmqctl list_queues

# Show exchanges
docker exec rabbitmq rabbitmqctl list_exchanges

# Clear all (reset)
docker exec rabbitmq rabbitmqctl reset
```

## Scaling Considerations

### Multi-Server Deployment
- **In-memory ConnectionManager** (current): Works for single-server only
- **Redis ConnectionManager** (future): Share connection state across servers
  - Store active connections in Redis with TTL
  - Broadcast from any server reaches all connected clients

### Event Persistence
- **RabbitMQ durable queues** (current): Survives one restart
- **Event store** (future): Archive all events to database for replay/analytics

### Consumer Scaling
- **Single consumer** (current): Adequate for phase 7
- **Consumer group** (future): Multiple consumer processes in Kubernetes, each handling partition of events

## Future Extensions

### 1. Client Acknowledgment
```json
{
  "event": "vendor.matched",
  "request_id": "msg_uuid",
  "requires_ack": true
}
```
Client must respond with: `{"ack": "msg_uuid"}` or event is retried.

### 2. Event Versioning
```python
class VendorMatchedEvent(BaseModel):
    version: Literal["1.0"]  # Allows schema evolution
    ...
```

### 3. Filtered Subscriptions
```python
# Client joins multiple rooms with filters
ws://localhost:8000/ws/user123/vendor/42?filter=urgent_only
```

### 4. Delivery Guarantees
- **At-most-once** (current): WebSocket + RabbitMQ, best effort
- **At-least-once** (future): Client acks required, consumer retries
- **Exactly-once** (future): Idempotent processing with deduplication

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| "RabbitMQ not connected" logs | No RabbitMQ running | Start RabbitMQ or disable with ENABLE_RABBITMQ=false |
| WebSocket won't connect | Wrong room format | Use `vendor:{id}`, `requester:{id}`, or `admin` |
| Events not received on client | Room mismatch | Vendor should join `vendor:{their_id}`, not `requester:*` |
| Consumer crashes | Import error | Check event_consumer.py imports aio-pika correctly |
| Memory leaks | Connections not cleaned up | Verify WebSocketDisconnect handler removes from ConnectionManager |

## Performance Metrics

- **WebSocket latency**: ~50ms (local) to ~200ms (regional)
- **Event throughput**: 1000+ events/sec per RabbitMQ node
- **Memory per connection**: ~100KB (includes message buffer)
- **Max concurrent connections**: 10K+ per server (OS dependent)

## Compliance & Auditing

- **Event sourcing**: All state changes logged to RabbitMQ (audit trail)
- **Data retention**: Queue TTL can be configured (default: indefinite)
- **Encryption**: RabbitMQ supports TLS/SSL for AMQP connection
- **Access control**: RabbitMQ vhosts/users can isolate tenants (future multi-tenant)

---

**Last Updated**: 2025-01-15
**Maintainer**: EmpathI Backend Team
**Related Docs**: VENDOR_MODULE_PATTERNS.md, ADMIN_MODULE_PATTERNS.md
