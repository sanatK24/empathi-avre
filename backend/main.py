from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from database import get_db, engine, Base
from api.v1.router import api_router
from apscheduler.schedulers.background import BackgroundScheduler
from database import SessionLocal
import os
# pyrefly: ignore [missing-import]
from sqlalchemy import text

# Create tables
Base.metadata.create_all(bind=engine)

# Auto-migrate new columns for campaigns table (Safe for Postgres & SQLite)
try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'USER'"))
except Exception:
    pass
    
try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE campaigns ADD COLUMN category_id INTEGER REFERENCES campaign_categories(id)"))
except Exception:
    pass
    
try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE campaigns ADD COLUMN subcategory_id INTEGER REFERENCES campaign_subcategories(id)"))
except Exception:
    pass

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE campaigns ADD COLUMN ai_analysis_data TEXT"))
except Exception:
    pass

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE campaigns ADD COLUMN verification_doc_url TEXT"))
except Exception:
    pass

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE campaigns ADD COLUMN verification_ocr_text TEXT"))
except Exception:
    pass



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