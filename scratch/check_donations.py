from database import SessionLocal
from models import Donation, Campaign
import sys

def check_donations():
    db = SessionLocal()
    try:
        donations = db.query(Donation).order_by(Donation.created_at.desc()).limit(5).all()
        print(f"Found {len(donations)} recent donations:")
        for d in donations:
            campaign = db.query(Campaign).filter(Campaign.id == d.campaign_id).first()
            print(f"ID: {d.id}, Amount: {d.amount}, Campaign: {campaign.title if campaign else 'N/A'}, Created: {d.created_at}")
    finally:
        db.close()

if __name__ == "__main__":
    check_donations()
