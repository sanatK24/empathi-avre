from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, get_db
from sqlalchemy.orm import Session
from sqlalchemy import text
from routes import auth_routes, vendor_routes, match_routes, admin_routes, requester_routes, campaign_routes, donation_routes, payment_routes
import models
from fastapi.responses import JSONResponse
import logging
import os

# Configure Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("AVRE")

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AVRE API",
    description="Adaptive Vendor Relevance Engine Backend",
    version="1.0.0",
    debug=True
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
]
# Add origins from environment if present
env_origins = os.getenv("CORS_ORIGINS")
if env_origins:
    ALLOWED_ORIGINS.extend(env_origins.split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Global Error Handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"GLOBAL ERROR: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal Server Error", "detail": str(exc) if app.debug else "hidden"}
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )

# Include Routes
app.include_router(auth_routes.router)
app.include_router(requester_routes.router)
app.include_router(vendor_routes.router)
app.include_router(match_routes.router)
app.include_router(admin_routes.router)
app.include_router(campaign_routes.router)
app.include_router(donation_routes.router)
app.include_router(payment_routes.router)

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        # Check DB
        db.execute(text("SELECT 1"))
        db_status = "Connected"
    except Exception as e:
        db_status = f"Error: {str(e)}"
    
    # Check Model
    model_path = "ml/model.pkl"
    model_status = "Loaded" if os.path.exists(model_path) else "Missing"
    
    return {
        "status": "Healthy" if db_status == "Connected" else "Unhealthy",
        "database": db_status,
        "ml_model": model_status,
        "version": "1.0.0"
    }

@app.get("/")
def root():
    return {
        "message": "Welcome to AVRE API",
        "docs": "/docs",
        "status": "Healthy"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
