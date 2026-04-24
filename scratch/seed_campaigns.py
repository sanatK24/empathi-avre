import sys
import os
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random

# Add backend to path so we can import models
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import SessionLocal
from models import User, Campaign, CampaignStatus, UrgencyLevel, UserRole, Donation, DonationStatus, CampaignUpdate
from core.security import get_password_hash

def seed_data():
    db = SessionLocal()
    try:
        print("🌱 Starting deep data flood (Campaigns, Donations, Updates)...")

        # 1. Create/Verify Users
        cities = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Pune"]
        users = []
        for i in range(1, 11):
            email = f"user{i}@example.com"
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                users.append(existing)
                continue
            
            user = User(
                name=f"Seeded User {i}",
                email=email,
                password_hash=get_password_hash("password123"),
                role=UserRole.REQUESTER,
                city=random.choice(cities),
                is_active=True
            )
            db.add(user)
            db.flush()
            users.append(user)
        
        db.commit()

        # 2. Clear existing campaigns to avoid ID conflicts and stale data
        db.query(Donation).delete()
        db.query(CampaignUpdate).delete()
        db.query(Campaign).delete()
        db.commit()

        # 3. Create Diverse Campaigns
        categories = ["Medical", "Disaster Relief", "Education", "Animal Welfare", "Environment", "Food Security"]
        titles = [
            "Emergency Oxygen Supply", "Flood Relief Fund", "Rural School Tech", 
            "Stray Animal Shelter", "Urban Forestation", "Community Kitchen",
            "Cancer Treatment Aid", "Earthquake Reconstruction", "Scholarships for Girls"
        ]

        for i in range(15):
            creator = random.choice(users)
            category = random.choice(categories)
            city = random.choice(cities)
            goal = random.choice([50000, 100000, 250000, 500000])
            
            campaign = Campaign(
                title=f"{random.choice(titles)} - {i+1}",
                description=f"This is a verified campaign for {category} in {city}. We are working with local volunteers to ensure every rupee is utilized effectively for the cause. Our mission is to provide transparency and immediate impact.",
                category=category,
                city=city,
                goal_amount=goal,
                raised_amount=0.0, # Will be updated by donations
                urgency_level=random.choice(list(UrgencyLevel)),
                status=CampaignStatus.ACTIVE,
                verified=True,
                created_by=creator.id,
                created_at=datetime.now() - timedelta(days=random.randint(5, 20))
            )
            db.add(campaign)
            db.flush()

            # 4. Flood Donations for this campaign
            num_donors = random.randint(5, 15)
            total_raised = 0
            for _ in range(num_donors):
                donor = random.choice(users)
                amount = random.randint(500, 5000)
                
                donation = Donation(
                    campaign_id=campaign.id,
                    user_id=donor.id,
                    amount=amount,
                    anonymous=random.choice([True, False, False]),
                    message=random.choice(["Good luck!", "Hope this helps.", "Supporting from " + city, None]),
                    status=DonationStatus.COMPLETED,
                    created_at=campaign.created_at + timedelta(days=random.randint(1, 4))
                )
                db.add(donation)
                total_raised += amount
            
            campaign.raised_amount = total_raised

            # 5. Flood Updates for this campaign
            updates = [
                ("Campaign Launched", "We have officially started our journey to help the community."),
                ("First Milestone Reached", f"Thanks to our early supporters, we've raised over ₹{total_raised // 2}!"),
                ("Operational Update", "Our team is on the ground assessing the situation and preparing for distribution.")
            ]
            for title, content in updates:
                upd = CampaignUpdate(
                    campaign_id=campaign.id,
                    title=title,
                    content=content,
                    created_at=campaign.created_at + timedelta(days=random.randint(1, 5))
                )
                db.add(upd)

        db.commit()
        print(f"🚀 Database Sync Complete! Campaigns, Donations, and Updates are now interconnected.")

    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
