import os
import sys

# Append backend directory to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import SessionLocal
from models import CampaignCategory

def inspect_categories():
    db = SessionLocal()
    try:
        categories = db.query(CampaignCategory).all()
        print(f"Campaign Categories:")
        for c in categories:
            print(f"ID: {c.id} | Name: {c.name} | Verification Level: {c.verification_level} | Active: {c.is_active}")
            print(f"  - Subcategories: {[s.name for s in c.subcategories]}")
            print(f"  - AI Validation Rules: {[r.capability for r in c.ai_rules]}")
    finally:
        db.close()

if __name__ == '__main__':
    inspect_categories()
