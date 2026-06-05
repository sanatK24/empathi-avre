import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import get_db, engine, Base, SessionLocal
from api.v1.router import api_router
from apscheduler.schedulers.background import BackgroundScheduler

def run_startup_migrations():
    from sqlalchemy import text
    for t, cols in [
        ("users", [
            ("address", "TEXT"), ("address_line_1", "VARCHAR"), ("address_line_2", "VARCHAR"),
            ("locality", "VARCHAR"), ("state_province", "VARCHAR"), ("postal_code", "VARCHAR"),
            ("country_code", "VARCHAR"), ("blood_group", "VARCHAR"), ("preferred_hospital", "VARCHAR"),
            ("accessibility_needs", "TEXT"), ("personal_categories", "TEXT"), ("lat", "FLOAT"), ("lng", "FLOAT")
        ]),
        ("campaigns", [
            ("category_id", "INTEGER"), ("subcategory_id", "INTEGER"), ("lat", "FLOAT"), ("lng", "FLOAT"),
            ("trust_score", "FLOAT"), ("verification_status", "VARCHAR"), ("verified", "BOOLEAN")
        ])
    ]:
        for col, typ in cols:
            try:
                with engine.begin() as conn:
                    conn.execute(text(f"ALTER TABLE {t} ADD COLUMN {col} {typ};"))
                print(f"[Startup] Successfully added column '{col}' to {t} table.")
            except Exception as e:
                if "duplicate column" not in str(e).lower() and "already exists" not in str(e).lower():
                    print(f"[Startup] Warning/Error adding '{col}' column to {t}: {e}")
    try:
        from models import CampaignReport
        Base.metadata.create_all(bind=engine)
    except Exception as e: print(f"[Startup] Error creating tables: {e}")
    try:
        from fix_enum import fix_userrole_enum
        fix_userrole_enum()
    except Exception as e: print(f"[Startup] Warning/Error running userrole enum fix: {e}")
run_startup_migrations()
scheduler = BackgroundScheduler()
@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        from models import Campaign, CampaignCategory
        import random
        cats = db.query(CampaignCategory).all()
        if cats and (campaigns := db.query(Campaign).filter(Campaign.category_id == None).all()):
            for camp in campaigns: camp.category_id = random.choice([c.id for c in cats])
            db.commit(); print(f"[Startup] Fixed {len(campaigns)} campaigns with missing category_ids.")
    except Exception as e: print(f"[Startup] Error fixing categories: {e}")
    finally: db.close()
    scheduler.start(); print("[Scheduler] Started background schedulers.")
    yield
    scheduler.shutdown(); print("[Scheduler] Stopped background schedulers.")
app = FastAPI(title="EmpathI API", description="EmpathI API", version="1.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "https://empathi-frontend.onrender.com"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(api_router)
@app.get("/")
def root(): return {"message": "EmpathI API running"}
@app.get("/health")
def health(): return {"status": "healthy"}
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)