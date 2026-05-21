import sys
import os

# Add backend directory to path
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
sys.path.append(backend_path)

from database import SessionLocal
from models import User
from services.campaign_service import CampaignService

db = SessionLocal()
try:
    john = db.query(User).filter(User.name == "John Doe").first()
    print(f"John: {john.name} (ID: {john.id})")
    recommendations = CampaignService.get_recommendations(db, john)
    print(f"Success! Count: {len(recommendations)}")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
