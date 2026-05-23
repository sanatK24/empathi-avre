import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, SessionLocal, engine
from models import User, UserRole, Vendor, Inventory, Request, RequestStatus, Campaign, CampaignStatus
from core.security import get_password_hash

def seed_uat():
    print("🚀 Seeding UAT Data into empathi.db...")
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # 1. Identify UAT users
        emails = ["admin@empathi.com", "vendor@empathi.com", "user@empathi.com"]
        uat_users = db.query(User).filter(User.email.in_(emails)).all()
        uat_user_ids = [u.id for u in uat_users]

        if uat_user_ids:
            # 2. Delete dependent data
            # Delete Campaigns created by UAT users
            db.query(Campaign).filter(Campaign.created_by.in_(uat_user_ids)).delete(synchronize_session=False)
            
            # Delete Requests created by UAT users
            db.query(Request).filter(Request.user_id.in_(uat_user_ids)).delete(synchronize_session=False)
            
            # Delete Inventory and Vendors for UAT users
            # First find vendors
            uat_vendors = db.query(Vendor).filter(Vendor.user_id.in_(uat_user_ids)).all()
            uat_vendor_ids = [v.id for v in uat_vendors]
            
            if uat_vendor_ids:
                db.query(Inventory).filter(Inventory.vendor_id.in_(uat_vendor_ids)).delete(synchronize_session=False)
                db.query(Vendor).filter(Vendor.id.in_(uat_vendor_ids)).delete(synchronize_session=False)

            # 3. Delete Users
            db.query(User).filter(User.id.in_(uat_user_ids)).delete(synchronize_session=False)
            db.commit()
            print(f"🗑️ Cleaned up existing UAT data for {emails}")

        # 4. Create New UAT Users
        admin = User(
            email="admin@empathi.com",
            password_hash=get_password_hash("password123"),
            name="UAT Admin",
            role=UserRole.ADMIN,
            is_active=True
        )
        
        vendor_user = User(
            email="vendor@empathi.com",
            password_hash=get_password_hash("password123"),
            name="UAT Vendor",
            role=UserRole.VENDOR,
            is_active=True,
            city="Mumbai"
        )
        
        requester = User(
            email="user@empathi.com",
            password_hash=get_password_hash("password123"),
            name="UAT Requester",
            role=UserRole.REQUESTER,
            is_active=True,
            city="Mumbai"
        )
        
        db.add_all([admin, vendor_user, requester])
        db.commit()
        db.refresh(vendor_user)
        db.refresh(requester)

        # 5. Create Vendor Profile
        vendor_profile = Vendor(
            user_id=vendor_user.id,
            shop_name="UAT Pharma Hub",
            category="Medical",
            lat=19.0760,
            lng=72.8777,
            city="Mumbai",
            rating=4.5,
            reliability_score=0.92,
            is_active=True
        )
        db.add(vendor_profile)
        db.commit()
        db.refresh(vendor_profile)

        # 6. Add Inventory
        oximeter = Inventory(
            vendor_id=vendor_profile.id,
            resource_name="Oximeter",
            category="Medical",
            quantity=100,
            price=950.0
        )
        mask = Inventory(
            vendor_id=vendor_profile.id,
            resource_name="N95 Mask",
            category="Safety",
            quantity=1000,
            price=45.0
        )
        db.add_all([oximeter, mask])

        # 7. Add Campaign
        forest_campaign = Campaign(
            title="UAT Green Mumbai Initiative",
            description="A massive tree plantation drive across suburban Mumbai to improve local air quality.",
            category="Environment",
            city="Mumbai",
            goal_amount=100000.0,
            raised_amount=15000.0,
            urgency_level="medium",
            status=CampaignStatus.ACTIVE,
            verified=True,
            created_by=requester.id
        )
        db.add(forest_campaign)
        db.commit()

        print("✅ UAT Seeding Complete!")
    except Exception as e:
        db.rollback()
        print(f"❌ Seeding Failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_uat()
