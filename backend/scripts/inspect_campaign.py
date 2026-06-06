import os
import sys

# Append backend directory to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import SessionLocal
from models import Campaign

def inspect_campaign():
    db = SessionLocal()
    try:
        c = db.query(Campaign).filter(Campaign.id == 19).first()
        if c:
            print(f"Campaign ID: {c.id}")
            print(f"Title: {c.title}")
            print(f"Description: {c.description}")
            print(f"Verification Doc URL: {c.verification_doc_url}")
        else:
            print("Campaign not found.")
    finally:
        db.close()

if __name__ == '__main__':
    inspect_campaign()
