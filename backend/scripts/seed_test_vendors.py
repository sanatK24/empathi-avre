import random
import os
import sys

# Ensure backend is in path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
from core.security import get_password_hash

def seed_vendors_for_test():
    db = SessionLocal()
    try:
        # 1. Clear existing vendors and inventory to start fresh for this test
        db.query(models.Inventory).delete()
        db.query(models.Match).delete()
        db.query(models.Vendor).delete()
        # Find and delete vendor users only (keep admins and re-testers if any)
        db.query(models.User).filter(models.User.role == models.UserRole.VENDOR).delete()
        db.commit()

        print("Seeding 20 diverse vendors...")
        
        cities = ["Mumbai", "Delhi", "Bangalore"]
        items = ["Oxygen Cylinder", "N95 Mask", "Basic Aid Kit", "Water Bottle"]
        
        # Mumbai Center for testing distance
        MUMBAI_LAT = 19.0760
        MUMBAI_LNG = 72.8777

        for i in range(1, 21):
            email = f"vendor{i}@test.com"
            user = models.User(
                name=f"Vendor Premium {i}",
                email=email,
                password_hash=get_password_hash("password123"),
                role=models.UserRole.VENDOR,
                phone=f"98765432{i:02d}",
                city="Mumbai",
                lat=MUMBAI_LAT + random.uniform(-0.1, 0.1),
                lng=MUMBAI_LNG + random.uniform(-0.1, 0.1),
                is_active=True
            )
            db.add(user)
            db.flush() # Get user id

            vendor = models.Vendor(
                user_id=user.id,
                shop_name=f"Emergency Supplies Lab {i}",
                category="Medical",
                lat=user.lat,
                lng=user.lng,
                city=user.city,
                rating=round(random.uniform(3.5, 5.0), 1),
                reliability_score=round(random.uniform(0.7, 1.0), 2),
                avg_response_time=random.randint(5, 60),
                verification_status=models.VerificationStatus.VERIFIED
            )
            db.add(vendor)
            db.flush()

            # Add same items with different parameters
            for item in items:
                inventory = models.Inventory(
                    vendor_id=vendor.id,
                    resource_name=item,
                    category="Health",
                    quantity=random.randint(5, 100),
                    price=random.randint(100, 5000),
                    expiry_date=None
                )
                db.add(inventory)
        
        # 3. Create Admin for testing
        admin_user = models.User(
            name="Platform Admin",
            email="admin@empathi.com",
            password_hash=get_password_hash("password123"),
            role=models.UserRole.ADMIN,
            is_active=True
        )
        db.add(admin_user)
        
        db.commit()
        print("Successfully seeded 20 vendors + Admin account.")

    except Exception as e:
        print(f"Error seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_vendors_for_test()
