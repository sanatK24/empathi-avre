from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from services.news_service import NewsService
from schemas import NewsArticleResponse

router = APIRouter()

@router.get("/trending", response_model=List[NewsArticleResponse])
def get_trending_news(db: Session = Depends(get_db)):
    """Get platform-wide trending/critical news"""
    return NewsService.get_trending(db)

@router.get("/feed", response_model=List[NewsArticleResponse])
def get_personalized_feed(
    city: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get location/category aware smart feed"""
    return NewsService.get_feed(db, city, category)

@router.get("/search", response_model=List[NewsArticleResponse])
def search_news(q: str, db: Session = Depends(get_db)):
    """Keyword search on news"""
    return NewsService.search_news(db, q)

@router.post("/sync")
def trigger_manual_sync(
    background_tasks: BackgroundTasks,
    city: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Trigger a manual RSS sync (admin/system only)"""
    background_tasks.add_task(NewsService.sync_news, db, city)
    return {"message": "Sync started in background"}
