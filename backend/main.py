from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from database import get_db, engine, Base
from api.v1.router import api_router
from apscheduler.schedulers.background import BackgroundScheduler
from database import SessionLocal
import os

# Create tables
Base.metadata.create_all(bind=engine)

# Auto-migrate new columns for campaigns table (Safe for Postgres & SQLite)
from sqlalchemy import text
try:
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE campaigns ADD COLUMN category_id INTEGER"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE campaigns ADD COLUMN subcategory_id INTEGER"))
        except Exception:
            pass
except Exception as e:
    print(f"Warning: Auto-migration failed: {e}")

app = FastAPI(
    title="EmpathI API",
    description="EmpathI API",
    version="1.1.0"
)

# Set up Scheduler
scheduler = BackgroundScheduler()


@app.on_event("startup")
def start_scheduler():
    scheduler.start()
    print("[Scheduler] Started background schedulers.")

@app.on_event("shutdown")
def shutdown_scheduler():
    scheduler.shutdown()
    print("[Scheduler] Stopped background schedulers.")

# Production + Localhost CORS
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",

    "https://empathi-frontend.onrender.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
app.include_router(api_router)

@app.get("/")
def root():
    return {
        "message": "EmpathI API running"
    }

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }