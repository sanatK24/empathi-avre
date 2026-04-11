from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from alembic.config import Config as AlembicConfig
from alembic import command
from database import Base, engine
from routes import auth_routes, vendor_routes, requester_routes, admin_routes
from realtime import connection_manager
from event_consumer import start_event_consumer, stop_event_consumer
import logging

logger = logging.getLogger(__name__)

# Run Alembic migrations
def run_migrations():
    """Execute pending Alembic migrations."""
    try:
        alembic_cfg = AlembicConfig(
            os.path.join(os.path.dirname(__file__), 'alembic.ini')
        )
        command.upgrade(alembic_cfg, 'head')
    except Exception as e:
        print(f"Migration warning: {e}")
        print("Falling back to table creation...")
        Base.metadata.create_all(bind=engine)

# Initialize database with migrations
run_migrations()

# Initialize app
app = FastAPI(
    title="AVRE API",
    description="Adaptive Vendor Relevance Engine",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ STARTUP/SHUTDOWN ============
@app.on_event("startup")
async def startup_event():
    """Initialize real-time services on startup."""
    logger.info("Initializing real-time services...")
    try:
        await start_event_consumer()
    except Exception as e:
        logger.error(f"Failed to start event consumer: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("Shutting down real-time services...")
    try:
        await stop_event_consumer()
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

# ============ WEBSOCKET ENDPOINT ============
@app.websocket("/ws/{user_id}/{room_type}/{room_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, room_type: str, room_id: str):
    """
    WebSocket endpoint for real-time notifications.
    
    Rooms:
    - vendor/{vendor_id}: Vendor notifications (matches, ratings, moderation)
    - requester/{requester_id}: Requester notifications (vendor responses)
    - admin: Admin notifications (moderation, flags)
    
    Example: ws://localhost:8000/ws/user123/vendor/vendor456
    """
    
    # Validate room format
    valid_types = ["vendor", "requester", "admin"]
    if room_type not in valid_types:
        await websocket.close(code=1008, reason="Invalid room type")
        return
    
    if room_type == "admin" and user_id != "admin":
        await websocket.close(code=1008, reason="Only admins can join admin room")
        return
    
    # Build room identifier
    if room_type == "admin":
        full_room_id = "admins"
    else:
        full_room_id = f"{room_type}:{room_id}"
    
    # Connect to room
    connection_id = await connection_manager.connect(websocket, full_room_id)
    logger.info(f"User {user_id} connected to {full_room_id}")
    
    try:
        while True:
            # Keep connection alive and receive ping/pong
            data = await websocket.receive_text()
            logger.debug(f"Message from {user_id}: {data}")
    
    except WebSocketDisconnect:
        connection_manager.disconnect(full_room_id, connection_id)
        logger.info(f"User {user_id} disconnected from {full_room_id}")
    
    except Exception as e:
        logger.error(f"WebSocket error for {user_id}: {e}")
        connection_manager.disconnect(full_room_id, connection_id)

# Include routers
app.include_router(auth_routes.router)
app.include_router(vendor_routes.router)
app.include_router(requester_routes.router)
app.include_router(admin_routes.router)

@app.get("/")
def root():
    """Health check endpoint."""
    return {
        "message": "AVRE API is running",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health():
    """Application health check."""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
