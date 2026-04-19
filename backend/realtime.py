"""Real-time notification service: WebSocket connection manager + RabbitMQ integration."""
import json
import logging
from typing import Dict, Set, List
from fastapi import WebSocket
import asyncio
from datetime import datetime
from events import EventType, EventPayload

logger = logging.getLogger(__name__)

# ============ CONNECTION MANAGER ============
class ConnectionManager:
    """Manages WebSocket connections organized by rooms (vendor, requester, admin)."""
    
    def __init__(self):
        # rooms: {room_id: {connection_id: websocket}}
        self.rooms: Dict[str, Dict[str, WebSocket]] = {}
        self.connection_id_counter = 0
    
    async def connect(self, websocket: WebSocket, room_id: str) -> str:
        """Accept WebSocket connection and add to room."""
        await websocket.accept()
        
        connection_id = f"conn_{self.connection_id_counter}_{datetime.utcnow().timestamp()}"
        self.connection_id_counter += 1
        
        if room_id not in self.rooms:
            self.rooms[room_id] = {}
        
        self.rooms[room_id][connection_id] = websocket
        logger.info(f"Connected to room {room_id}: {connection_id}")
        return connection_id
    
    def disconnect(self, room_id: str, connection_id: str):
        """Remove connection from room."""
        if room_id in self.rooms and connection_id in self.rooms[room_id]:
            del self.rooms[room_id][connection_id]
            logger.info(f"Disconnected from room {room_id}: {connection_id}")
            
            # Clean up empty rooms
            if not self.rooms[room_id]:
                del self.rooms[room_id]
    
    async def broadcast_to_room(self, room_id: str, payload: dict):
        """Broadcast message to all connections in a room."""
        if room_id not in self.rooms:
            logger.debug(f"No connections in room {room_id}")
            return
        
        disconnected = []
        for connection_id, websocket in self.rooms[room_id].items():
            try:
                await websocket.send_json(payload)
            except Exception as e:
                logger.error(f"Error sending to {connection_id}: {e}")
                disconnected.append(connection_id)
        
        # Clean up disconnected clients
        for connection_id in disconnected:
            self.disconnect(room_id, connection_id)
    
    async def broadcast_to_rooms(self, room_ids: List[str], payload: dict):
        """Broadcast to multiple rooms."""
        tasks = [self.broadcast_to_room(room_id, payload) for room_id in room_ids]
        await asyncio.gather(*tasks)
    
    def get_active_rooms(self) -> Dict[str, int]:
        """Get count of active connections per room."""
        return {room_id: len(conns) for room_id, conns in self.rooms.items()}


# Global connection manager
connection_manager = ConnectionManager()


# ============ EVENT EMITTER ============
class EventEmitter:
    """Emits events to RabbitMQ for distributed notification delivery."""
    
    def __init__(self, rabbitmq_url: str = "amqp://guest:guest@localhost/"):
        self.rabbitmq_url = rabbitmq_url
        self.connection = None
        self.channel = None
        self.exchange_name = "avre_events"
    
    async def connect(self):
        """Establish connection to RabbitMQ."""
        try:
            import aio_pika
            self.connection = await aio_pika.connect_robust(self.rabbitmq_url)
            self.channel = await self.connection.channel()
            
            # Declare exchange (durable for persistence)
            exchange = await self.channel.declare_exchange(
                self.exchange_name,
                aio_pika.ExchangeType.TOPIC,
                durable=True
            )
            logger.info("Connected to RabbitMQ")
        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            self.connection = None
            self.channel = None
    
    async def disconnect(self):
        """Close RabbitMQ connection."""
        if self.connection:
            await self.connection.close()
    
    async def emit_event(self, event: EventPayload):
        """Publish event to RabbitMQ."""
        if not self.channel:
            logger.warning("RabbitMQ not connected, event not emitted")
            return
        
        try:
            import aio_pika
            
            # Use event type as routing key for topic exchange
            routing_key = event.event_type.value
            message = aio_pika.Message(
                body=json.dumps(event.dict(), default=str).encode(),
                content_type='application/json',
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT
            )
            
            await self.channel.default_exchange.publish(
                message,
                routing_key=f"{self.exchange_name}.{routing_key}"
            )
            logger.info(f"Event emitted: {routing_key}")
        except Exception as e:
            logger.error(f"Failed to emit event: {e}")
    
    async def subscribe_to_events(self, routing_keys: List[str], callback):
        """Subscribe to events (for background consumer)."""
        if not self.channel:
            logger.warning("RabbitMQ not connected")
            return
        
        try:
            import aio_pika
            
            # Declare queue
            queue = await self.channel.declare_queue(durable=True)
            
            # Bind to routing patterns
            for key in routing_keys:
                await queue.bind(self.exchange_name, routing_key=key)
            
            # Consume messages
            async with queue.iterator() as queue_iter:
                async for message in queue_iter:
                    async with message.process():
                        try:
                            event_data = json.loads(message.body.decode())
                            await callback(event_data)
                        except Exception as e:
                            logger.error(f"Error processing message: {e}")
        except Exception as e:
            logger.error(f"Subscription error: {e}")


# Global event emitter
event_emitter = EventEmitter()


# ============ EVENT ROUTING ============
def get_event_rooms(event_type: EventType, event_data: dict) -> List[str]:
    """Determine which rooms should receive an event."""
    rooms = []
    
    if event_type == EventType.VENDOR_MATCHED:
        # Notify specific vendor
        rooms.append(f"vendor:{event_data['vendor_id']}")
    
    elif event_type in [
        EventType.MATCH_ACCEPTED_BY_VENDOR,
        EventType.MATCH_REJECTED_BY_VENDOR
    ]:
        # Notify requester
        rooms.append(f"requester:{event_data['requester_id']}")
    
    elif event_type == EventType.MATCH_ACCEPTED_BY_REQUESTER:
        # Notify admin + vendor (for rating info)
        rooms.append("admins")
        rooms.append(f"vendor:{event_data['vendor_id']}")
    
    elif event_type == EventType.MATCH_CANCELLED:
        # Notify affected vendors
        for vendor_id in event_data.get('affected_vendor_ids', []):
            rooms.append(f"vendor:{vendor_id}")
    
    elif event_type in [
        EventType.VENDOR_FLAGGED,
        EventType.VENDOR_VERIFIED,
        EventType.VENDOR_REJECTED
    ]:
        # Notify specific vendor + admins
        rooms.append(f"vendor:{event_data['vendor_id']}")
        rooms.append("admins")
    
    elif event_type == EventType.VENDOR_RATING_UPDATED:
        # Notify vendor + admins
        rooms.append(f"vendor:{event_data['vendor_id']}")
        rooms.append("admins")
    
    elif event_type == EventType.REQUEST_FLAGGED:
        # Notify admins
        rooms.append("admins")
    
    return rooms


async def emit_and_broadcast(event_type: EventType, event_data: dict):
    """Emit event to RabbitMQ and broadcast to relevant WebSocket rooms."""
    payload = EventPayload(
        event_type=event_type,
        timestamp=datetime.utcnow(),
        data=event_data
    )
    
    # Emit to RabbitMQ (for background workers + persistence)
    await event_emitter.emit_event(payload)
    
    # Broadcast to WebSocket rooms
    rooms = get_event_rooms(event_type, event_data)
    message = {
        "event": event_type.value,
        "timestamp": payload.timestamp.isoformat(),
        "data": event_data
    }
    await connection_manager.broadcast_to_rooms(rooms, message)
