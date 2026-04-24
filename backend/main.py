from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
from database import get_db, engine, Base
from api.v1.router import api_router
from config import settings
import os

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(

    title="EmpathI API",
    description="EmpathI API (Simplified)",
    version="1.1.0"
)

# Essential CORS
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Standard API Router
app.include_router(api_router)

@app.get("/health")
def health_check():
    return {"status": "Healthy"}

@app.get("/")
def root():
    return {"message": "EmpathI API is running"}

if __name__ == "__main__":
    import uvicorn
    # Use standard host and port
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        reload_excludes=["*.db", "*.db-journal", "*.db-shm", "*.db-wal"]
    )
