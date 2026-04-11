# Phase 7: Real-Time Notifications - Implementation Checklist

## Completed Tasks ✅

### 1. Infrastructure Layer
- [x] `realtime.py` - Connection manager + event emitter
  - [x] ConnectionManager class with room-based connection tracking
  - [x] EventEmitter class with async RabbitMQ integration
  - [x] Event routing logic (`get_event_rooms`)
  - [x] Combined emission function (`emit_and_broadcast`)
  
- [x] `event_consumer.py` - Background event processor
  - [x] EventConsumer class with start/stop lifecycle
  - [x] Message consumption loop
  - [x] Event parsing and routing
  - [x] WebSocket broadcast integration
  
- [x] `events.py` - Event type definitions (Phase 6 carryover)
  - [x] EventType enum (10 event types)
  - [x] EventPayload base model
  - [x] 8 specific event payload schemas

### 2. Server Integration
- [x] `main.py` - WebSocket endpoint + lifecycle
  - [x] Added startup event handler (`startup_event`)
  - [x] Added shutdown event handler (`shutdown_event`)
  - [x] Added WebSocket endpoint: `/ws/{user_id}/{room_type}/{room_id}`
  - [x] Connection validation (room type, admin check)
  - [x] Disconnect handling
  
### 3. Route Integration
- [x] `requester_routes.py` - Requester event emissions
  - [x] `create_request` → (generic event, can be enhanced)
  - [x] `get_matches` → Emit `vendor.matched` for each candidate
  - [x] `accept_vendor` → Emit `match.accepted_by_requester`
  - [x] `cancel_request` → Emit `match.cancelled`
  
- [x] `vendor_routes.py` - Vendor event emissions
  - [x] `accept_match` → Emit `match.accepted_by_vendor`
  - [x] `reject_match` → Emit `match.rejected_by_vendor`
  
- [x] `admin_routes.py` - Admin event emissions
  - [x] `verify_vendor` → Emit `vendor.verified`
  - [x] `reject_vendor` → Emit `vendor.rejected`
  - [x] `flag_vendor` → Emit `vendor.flagged`
  - [x] `flag_request` → Emit `request.flagged`

### 4. Dependencies
- [x] Updated `requirements.txt`
  - [x] `websockets==12.0` (WebSocket server)
  - [x] `aio-pika==13.3.0` (Async RabbitMQ client)
  - [x] `python-dotenv==1.0.0` (Environment configuration)

### 5. Documentation
- [x] `REALTIME_PATTERNS.md` - Architecture & patterns (comprehensive)
- [x] `REALTIME_QUICKSTART.md` - Quick start guide for developers
- [x] This checklist

### 6. Code Quality
- [x] All Python files compile without errors
- [x] Proper error handling (try/except in consumer, on_event handlers)
- [x] Logging throughout (logger setup in main.py and event_consumer.py)
- [x] Type hints on all functions
- [x] Docstrings on classes and key methods

---

## Testing Checklist

### Unit Testing (Not Yet Implemented)
- [ ] ConnectionManager unit tests
  - [ ] `connect()` - adds to room
  - [ ] `disconnect()` - removes from room
  - [ ] `broadcast_to_room()` - sends to all in room
  - [ ] `get_active_rooms()` - counts connections
  
- [ ] EventEmitter unit tests
  - [ ] `connect()` - establishes RabbitMQ connection
  - [ ] `emit_event()` - publishes to exchange
  - [ ] Fallback behavior when RabbitMQ unavailable
  
- [ ] EventConsumer unit tests
  - [ ] `start()` - initializes consumer
  - [ ] `_handle_message()` - parses and broadcasts
  - [ ] `stop()` - cleanups properly

### Integration Testing
- [ ] WebSocket connection
  - [ ] Connect with valid room format: `ws://localhost:8000/ws/user123/vendor/42`
  - [ ] Reject invalid room type
  - [ ] Reject non-admin trying to join admin room
  - [ ] Disconnect removes from rooms
  
- [ ] Event flow end-to-end
  - [ ] Requester matches → Vendor receives notification
  - [ ] Vendor accepts → Requester receives notification
  - [ ] Admin flags → Vendor + Admin both receive
  - [ ] Request cancelled → All affected vendors notified
  
- [ ] Error scenarios
  - [ ] RabbitMQ unavailable → Events still broadcast via WebSocket
  - [ ] Client disconnects → Connection removed, no leaks
  - [ ] Malformed WebSocket message → Handle gracefully
  - [ ] Invalid event data → Log and skip

### Load Testing
- [ ] 100 concurrent WebSocket connections
- [ ] 1000 events/second throughput
- [ ] Memory usage < 1GB for 10K connections
- [ ] CPU < 50% utilization

---

## Frontend Integration (Pending)

### Required Frontend Work
- [ ] WebSocket client library (Vue/React hook)
  - [ ] Auto-reconnect with exponential backoff
  - [ ] Heartbeat/ping-pong handling
  - [ ] Event subscription manager
  
- [ ] UI Integration
  - [ ] Vendor module: Show incoming match notifications
  - [ ] Requester module: Show vendor response live
  - [ ] Admin dashboard: Show moderation events live
  - [ ] Notification toast component
  
- [ ] State Management
  - [ ] Update Vuex/Redux on events
  - [ ] Handle out-of-order events
  - [ ] Deduplication (same event received twice)

### Example: Vue Composable
```javascript
// composables/useRealtimeNotifications.js
import { ref, onMounted, onUnmounted } from 'vue'

export fn useRealtimeNotifications(userId, roomType, roomId) {
  const ws = ref(null)
  const isConnected = ref(false)
  
  const connect = () => {
    ws.value = new WebSocket(
      `ws://localhost:8000/ws/${userId}/${roomType}/${roomId}`
    )
    ws.value.onopen = () => { isConnected.value = true }
    ws.value.onmessage = (event) => {
      const { event_type, data } = JSON.parse(event.data)
      // emit custom event or dispatch to store
      emit('event', { type: event_type, data })
    }
  }
  
  onMounted(connect)
  onUnmounted(() => ws.value?.close())
  
  return { isConnected }
}
```

---

## Deployment Checklist

### Local Development
- [x] Backend runs without errors
- [x] WebSocket endpoint responds on `/ws/...`
- [x] All dependencies installed
- [ ] Test with RabbitMQ Docker container
- [ ] Test WebSocket client connection (wscat or postman)

### Staging/Production
- [ ] RabbitMQ deployed (Docker/managed service)
- [ ] Environment variables configured (RABBITMQ_URL, ENABLE_RABBITMQ)
- [ ] WebSocket secured with WSS (TLS)
- [ ] CORS headers configured for WebSocket
- [ ] Connection limits set (max 10K per server)
- [ ] Monitoring/alerting on WebSocket metrics
- [ ] Graceful shutdown tested (active connections cleaned up)
- [ ] Load balancer supports WebSocket upgrade
- [ ] Persistence/replay configured if needed

---

## Known Limitations & Future Work

### Current Limitations
1. **Single-server only**: In-memory ConnectionManager doesn't scale horizontally
2. **Best-effort delivery**: Events emitted via async tasks, not guaranteed
3. **No client authentication**: WebSocket endpoint accepts any user_id
4. **No message ordering guarantees**: RabbitMQ doesn't guarantee order in TOPIC exchange
5. **No encryption**: WebSocket is plain HTTP (needs WSS in production)

### Future Enhancements
1. **Multi-server support**
   - [ ] Switch ConnectionManager to Redis
   - [ ] Publish to all servers' WebSocket layers
   
2. **Guaranteed delivery**
   - [ ] Implement client acknowledgment
   - [ ] Persist unacked messages to database
   - [ ] Retry logic for failed deliveries
   
3. **Advanced subscriptions**
   - [ ] Filter events by criteria (e.g., urgency > NORMAL)
   - [ ] Subscribe to multiple rooms with priorities
   - [ ] Dead letter queues for failed events
   
4. **Security hardening**
   - [ ] JWT validation on WebSocket upgrade
   - [ ] Rate limiting per connection
   - [ ] Audit logging for all real-time events
   
5. **Performance**
   - [ ] Message compression (gzip)
   - [ ] Connection pooling for RabbitMQ
   - [ ] Batch event publication
   
6. **Monitoring**
   - [ ] Prometheus metrics export
   - [ ] Event latency tracking
   - [ ] Connection lifecycle events
   - [ ] Alert on consumer lag

---

## Architecture Decision Log

| Decision | Date | Rationale | Status |
|----------|------|-----------|--------|
| Use async tasks (`create_task`) instead of sync | 2025-01-15 | Non-blocking HTTP responses | ✅ Implemented |
| TOPIC exchange instead of DIRECT | 2025-01-15 | Flexible routing and future subscriptions | ✅ Implemented |
| Room-based model (not user-based) | 2025-01-15 | Simplifies broadcast logic for multi-user scenarios | ✅ Implemented |
| In-memory ConnectionManager initially | 2025-01-15 | Fast, simple for MVP; Redis later | ✅ Implemented |
| Background consumer task | 2025-01-15 | Decouples event processing from request handlers | ✅ Implemented |

---

## File Summary

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `realtime.py` | ~280 | Connection + event management | ✅ Complete |
| `event_consumer.py` | ~120 | Background event processor | ✅ Complete |
| `events.py` | ~160 | Event type definitions | ✅ Complete (Phase 6) |
| `main.py` | +50 lines | WebSocket endpoint + lifecycle | ✅ Complete |
| `requester_routes.py` | +40 lines | Event emissions for requester | ✅ Complete |
| `vendor_routes.py` | +40 lines | Event emissions for vendor | ✅ Complete |
| `admin_routes.py` | +50 lines | Event emissions for admin | ✅ Complete |
| `REALTIME_PATTERNS.md` | ~450 | Architecture documentation | ✅ Complete |
| `REALTIME_QUICKSTART.md` | ~300 | Quick start guide | ✅ Complete |
| **Total** | **~1500** | **Complete real-time system** | ✅ |

---

## Handoff Notes

**For Frontend Developer**:
- WebSocket endpoint is `/ws/{user_id}/{room_type}/{room_id}`
- Room types: `vendor:{id}`, `requester:{id}`, `admin`
- Message format: `{ event: "event_type", timestamp: "ISO", data: {...} }`
- Expected events per role:
  - **Vendor**: `vendor.matched`, `match.accepted_by_requester`, `vendor.verified|rejected|flagged`
  - **Requester**: `match.accepted_by_vendor`, `match.rejected_by_vendor`, `match.cancelled`
  - **Admin**: `vendor.verified|rejected|flagged`, `request.flagged`

**For DevOps**:
- RabbitMQ must be deployed (Docker or managed service)
- Environment: `RABBITMQ_URL=amqp://`, `ENABLE_RABBITMQ=true`
- WebSocket exposed on port 8000 (same as FastAPI)
- Consider Redis for future scale-out
- Monitor: Queue depth, consumer lag, connection count

**For QA**:
- Test each event type by triggering state changes
- Verify WebSocket delivery from multiple clients
- Test disconnection + reconnection scenarios
- Load test: 100+ concurrent connections
- Document any race conditions or event ordering issues

---

**Phase 7 Status**: ✅ **COMPLETE**
**Next Phase**: Frontend integration or verifier module (FR-501+)
