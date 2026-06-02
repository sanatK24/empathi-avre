from contextlib import asynccontextmanager
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

# Set up Scheduler
scheduler = BackgroundScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fix missing categories on startup (useful for Render deploy to Supabase)
    db = SessionLocal()
    try:
        from models import Campaign, CampaignCategory
        import random
        import json
        from sqlalchemy import text

        cats = db.query(CampaignCategory).all()
        if cats:
            cat_ids = [c.id for c in cats]
            campaigns = db.query(Campaign).filter(Campaign.category_id == None).all()
            if campaigns:
                for camp in campaigns:
                    camp.category_id = random.choice(cat_ids)
                db.commit()
                print(f"[Startup] Fixed {len(campaigns)} campaigns with missing category_ids.")

        # OCR Database Cleanup: Strip out old OCR insights from campaigns
        campaigns_with_ai = db.query(Campaign).filter(Campaign.ai_analysis_data != None).all()
        cleaned_count = 0
        for camp in campaigns_with_ai:
            try:
                ai_data = json.loads(camp.ai_analysis_data)
                if isinstance(ai_data, dict) and "docInsights" in ai_data:
                    del ai_data["docInsights"]
                    camp.ai_analysis_data = json.dumps(ai_data)
                    cleaned_count += 1
            except Exception as parse_err:
                print(f"[Startup] Failed to parse ai_analysis_data for campaign {camp.id}: {parse_err}")
        
        if cleaned_count > 0:
            db.commit()
            print(f"[Startup] [OCR Cleanup] Cleaned up docInsights (OCR text) from {cleaned_count} campaigns in the database.")

        # Clear raw verification_ocr_text if column exists
        try:
            db.execute(text("UPDATE campaigns SET verification_ocr_text = NULL WHERE verification_ocr_text IS NOT NULL"))
            db.commit()
            print("[Startup] [OCR Cleanup] Raw verification_ocr_text column cleared in database.")
        except Exception:
            pass

    except Exception as e:
        print(f"[Startup] Error fixing categories/OCR: {e}")
    finally:
        db.close()

    scheduler.start()
    print("[Scheduler] Started background schedulers.")
    yield
    scheduler.shutdown()
    print("[Scheduler] Stopped background schedulers.")

app = FastAPI(
    title="EmpathI API",
    description="EmpathI API",
    version="1.1.0",
    lifespan=lifespan
)

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)