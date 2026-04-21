from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
from database import get_db
from api.v1.router import api_router
from core.logging import logger
from event_consumer import start_event_consumer, stop_event_consumer
from config import settings
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start event consumer if RabbitMQ is enabled
    if settings.ENABLE_RABBITMQ:
        await start_event_consumer()
    
    yield
    
    # Shutdown: Stop event consumer
    if settings.ENABLE_RABBITMQ:
        await stop_event_consumer()

app = FastAPI(
    title="EmpathI API",
    description="EmpathI Coordination & Matching Engine (Production-Grade)",
    version="1.1.0",
    lifespan=lifespan
)

# CORS - configured from environment
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
]
env_origins = os.getenv("CORS_ORIGINS")
if env_origins:
    ALLOWED_ORIGINS.extend(env_origins.split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
# We mount it without a prefix to maintain compatibility with existing frontend URLs 
# (e.g., /auth/login instead of /api/v1/auth/login)
app.include_router(api_router)

# Legacy Route Compatibility (for modules not yet refactored)
from routes import donation_routes, payment_routes
app.include_router(donation_routes.router)
app.include_router(payment_routes.router)

@app.get("/health")
def health_check():
    return {"status": "Healthy", "version": "1.1.0"}

@app.get("/")
def root():
    return {"message": "Welcome to EmpathI Production API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
