from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import get_db, engine, Base
from api.v1.router import api_router
import os

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="EmpathI API",
    description="EmpathI API",
    version="1.1.0"
)

# Production + Localhost CORS
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",

    "https://empathi-frontend.onrender.com",
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