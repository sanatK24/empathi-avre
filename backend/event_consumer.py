"""Background task for consuming RabbitMQ events and broadcasting to WebSocket clients."""
import asyncio
import json
import logging
from typing import Callable
from realtime import event_emitter, connection_manager
from events import EventPayload, EventType

logger = logging.getLogger(__name__)


class EventConsumer:
    """Consumes events from RabbitMQ and broadcasts to WebSocket clients."""
    
    def __init__(self):
        self.running = False
        self.task = None
    
    async def start(self):
        """Start consuming events from RabbitMQ."""
        if self.running:
            logger.warning("Consumer already running")
            return
        
        self.running = True
        logger.info("Starting event consumer...")
        
        try:
            import aio_pika
            
            # Connect to RabbitMQ
            await event_emitter.connect()
            
            # Create connection for consumer (separate from emitter)
            connection = await aio_pika.connect_robust(event_emitter.rabbitmq_url)
            channel = await connection.channel()
            
            # Declare exchange
            exchange = await channel.declare_exchange(
                event_emitter.exchange_name,
                aio_pika.ExchangeType.TOPIC,
                durable=True
            )
            
            # Declare queue for this consumer
            queue = await channel.declare_queue(
                "avre_events_consumer",
                durable=True,
                auto_delete=False
            )
            
            # Bind to all event types
            event_types = [e.value for e in EventType]
            for event_type in event_types:
                await queue.bind(exchange, routing_key=f"{event_emitter.exchange_name}.{event_type}")
            
            # Start consuming
            self.task = asyncio.create_task(
                self._consume_loop(queue),
                name="event_consumer"
            )
            logger.info("Event consumer started")
        
        except Exception as e:
            logger.error(f"Failed to start event consumer: {e}")
            self.running = False
    
    async def _consume_loop(self, queue):
        """Main consumption loop."""
        try:
            async with queue.iterator() as queue_iter:
                async for message in queue_iter:
                    async with message.process():
                        try:
                            await self._handle_message(message)
                        except Exception as e:
                            logger.error(f"Error handling message: {e}")
        except asyncio.CancelledError:
            logger.info("Event consumer cancelled")
        except Exception as e:
            logger.error(f"Consumer loop error: {e}")
            self.running = False
    
    async def _handle_message(self, message):
        """Process a single message from RabbitMQ."""
        try:
            event_data = json.loads(message.body.decode())
            event_type = EventType(event_data.get('event_type'))
            payload_data = event_data.get('data', {})
            
            logger.debug(f"Received event: {event_type.value}")
            
            # Determine target rooms and broadcast
            from realtime import get_event_rooms
            rooms = get_event_rooms(event_type, payload_data)
            
            broadcast_payload = {
                "event": event_type.value,
                "timestamp": event_data.get('timestamp'),
                "data": payload_data
            }
            
            await connection_manager.broadcast_to_rooms(rooms, broadcast_payload)
            
        except Exception as e:
            logger.error(f"Error processing event message: {e}")
    
    async def stop(self):
        """Stop consuming events."""
        if not self.running:
            return
        
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        
        await event_emitter.disconnect()
        logger.info("Event consumer stopped")


# Global consumer instance
event_consumer = EventConsumer()


async def start_event_consumer():
    """Start event consumer on app startup."""
    await event_consumer.start()


async def stop_event_consumer():
    """Stop event consumer on app shutdown."""
    await event_consumer.stop()
