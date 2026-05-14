import feedparser
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime
import urllib.parse
import requests
import json
from sqlalchemy.orm import Session
from sqlalchemy import desc
from textblob import TextBlob
from models import NewsArticle

class NewsService:
    @staticmethod
    def is_relevant_ollama(text: str) -> bool:
        try:
            prompt = (
                "You are an AI content filter for an emergency and humanitarian app. "
                "Analyze this news text: '" + text[:500] + "'. "
                "Is this news relevant to civic emergencies, natural disasters, humanitarian aid, medical crises, or public safety? "
                "News about politics, real estate, entertainment, elections, concerts, or generic updates must be rejected. "
                "Respond with ONLY the word 'YES' if it is relevant, or 'NO' if it should be rejected."
            )
            response = requests.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "llama3.2:1b",
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.0}
                },
                timeout=5
            )
            if response.status_code == 200:
                answer = response.json().get('response', '').strip().upper()
                return "YES" in answer
        except Exception as e:
            print(f"Ollama filter failed: {e}")
            # Fallback to basic keyword banlist if Ollama is unreachable
            banned_keywords = ['election', 'politics', 'bollywood', 'cricket', 'real estate', 'paying guest', 'pg in', 'concert', 'bjp', 'congress', 'shinde', 'thackeray']
            return not any(b in text.lower() for b in banned_keywords)
        return True
    @staticmethod
    def calculate_urgency(text: str) -> float:
        text = text.lower()
        urgency_keywords = {
            'explosion': 0.9, 'flood': 0.8, 'earthquake': 0.9,
            'oxygen shortage': 0.8, 'missing': 0.6, 'urgent': 0.7,
            'accident': 0.7, 'blood needed': 0.8, 'emergency': 0.7,
            'outbreak': 0.8, 'cyclone': 0.8, 'landslide': 0.8,
            'crisis': 0.7, 'fatal': 0.9, 'deaths': 0.8, 'casualties': 0.8
        }
        score = 0.0
        for kw, val in urgency_keywords.items():
            if kw in text:
                score += val
        return min(score, 1.0)
        
    @staticmethod
    def get_sentiment(text: str) -> str:
        polarity = TextBlob(text).sentiment.polarity
        if polarity < -0.3: return "negative"
        if polarity > 0.3: return "positive"
        return "neutral"
        
    @staticmethod
    def categorize_article(text: str) -> str:
        text = text.lower()
        if any(w in text for w in ['doctor', 'hospital', 'medical', 'outbreak', 'disease', 'blood', 'oxygen']):
            return "Medical"
        if any(w in text for w in ['flood', 'earthquake', 'cyclone', 'landslide', 'weather', 'tsunami']):
            return "Disaster"
        if any(w in text for w in ['volunteer', 'ngo', 'donation', 'donate', 'relief fund', 'charity']):
            return "Community"
        if any(w in text for w in ['police', 'government', 'advisory', 'alert', 'curfew', 'law']):
            return "Civic"
        return "General"

    @staticmethod
    def parse_google_news(city: str = None, category_query: str = None):
        """Fetch RSS from Google News"""
        base_query = []
        if city:
            base_query.append(f'"{city}"')
        if category_query:
            base_query.append(category_query)
        else:
            base_query.append("(emergency OR disaster OR hospital OR rescue OR relief OR crisis OR medical OR outbreak OR ambulance OR accident OR fire)")
            
        q = " AND ".join(base_query)
        encoded_q = urllib.parse.quote(q)
        url = f"https://news.google.com/rss/search?q={encoded_q}&hl=en-IN&gl=IN&ceid=IN:en"
        
        feed = feedparser.parse(url)
        parsed_articles = []
        
        for entry in feed.entries[:20]: # Limit to top 20 per fetch to avoid spam
            # Cleanup description HTML
            soup = BeautifulSoup(entry.get('summary', ''), 'html.parser')
            desc = soup.get_text(strip=True)
            
            # Extract image if exists in content
            img_tag = soup.find('img')
            image_url = img_tag['src'] if img_tag else None
            
            title = entry.get('title', '')
            full_text = f"{title} {desc}"
            
            # Filter using local Ollama model (qwen3.5:latest)
            if not NewsService.is_relevant_ollama(full_text):
                continue
            
            # PubDate
            pub_date = datetime.utcnow()
            if 'published' in entry:
                try:
                    pub_date = parsedate_to_datetime(entry.published)
                    # Convert to naive UTC datetime for SQLAlchemy
                    pub_date = pub_date.replace(tzinfo=None)
                except Exception:
                    pass
            
            parsed_articles.append({
                "title": title,
                "description": desc[:500] if desc else None,
                "link": entry.get('link', ''),
                "source": entry.get('source', {}).get('title', 'Google News'),
                "published_at": pub_date,
                "image_url": image_url,
                "city": city,
                "category": NewsService.categorize_article(full_text),
                "urgency_score": NewsService.calculate_urgency(full_text),
                "sentiment": NewsService.get_sentiment(full_text)
            })
            
        return parsed_articles

    @staticmethod
    def sync_news(db: Session, city: str = None, query: str = None):
        articles = NewsService.parse_google_news(city, query)
        added_count = 0
        for article_data in articles:
            # Check if exists by link
            exists = db.query(NewsArticle).filter(NewsArticle.link == article_data['link']).first()
            if not exists:
                new_article = NewsArticle(**article_data)
                db.add(new_article)
                added_count += 1
        db.commit()
        return added_count

    @staticmethod
    def get_feed(db: Session, city: str = None, category: str = None, limit: int = 50):
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        query = db.query(NewsArticle).filter(NewsArticle.published_at >= seven_days_ago)
        if city:
            query = query.filter(NewsArticle.city.ilike(f"%{city}%"))
        if category:
            query = query.filter(NewsArticle.category == category)
        
        # Priority sort: Newest first, then urgency
        return query.order_by(desc(NewsArticle.published_at), desc(NewsArticle.urgency_score)).limit(limit).all()

    @staticmethod
    def get_trending(db: Session, limit: int = 10):
        # Trending = highest urgency across the platform, but sorted by newest, strictly within last 7 days
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        return db.query(NewsArticle).filter(
            NewsArticle.urgency_score >= 0.5,
            NewsArticle.published_at >= seven_days_ago
        ).order_by(desc(NewsArticle.published_at)).limit(limit).all()
        
    @staticmethod
    def search_news(db: Session, q: str, limit: int = 20):
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        return db.query(NewsArticle).filter(
            NewsArticle.title.ilike(f"%{q}%"),
            NewsArticle.published_at >= seven_days_ago
        ).order_by(desc(NewsArticle.published_at)).limit(limit).all()
