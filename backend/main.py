from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from database import get_db, engine, Base
from api.v1.router import api_router
from apscheduler.schedulers.background import BackgroundScheduler
from services.news_service import NewsService
from database import SessionLocal
import os

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="EmpathI API",
    description="EmpathI API",
    version="1.1.0"
)

# Set up Scheduler
scheduler = BackgroundScheduler()

def scheduled_news_sync():
    db = SessionLocal()
    try:
        print("[Scheduler] Running background news sync...")
        added = NewsService.sync_news(db)
        print(f"[Scheduler] Added {added} new articles.")
    except Exception as e:
        print(f"[Scheduler] Error syncing news: {e}")
    finally:
        db.close()

@app.on_event("startup")
def start_scheduler():
    scheduler.add_job(scheduled_news_sync, 'interval', minutes=15)
    scheduler.start()
    print("[Scheduler] Started RSS feed scheduler.")

@app.on_event("shutdown")
def stop_scheduler():
    scheduler.shutdown()
    print("[Scheduler] Stopped RSS feed scheduler.")

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