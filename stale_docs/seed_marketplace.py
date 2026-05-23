# pyrefly: ignore [missing-import]
import random
import os
import sys
import json
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
import models
from models import User, Vendor, Inventory, VerificationStatus, UserRole
from core.security import get_password_hash

# Add the current directory to sys.path so we can import backend modules
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), "backend"))

def seed():
    # Targeted database reset to preserve campaigns and general tables
    db = SessionLocal()
    try:
        print("Cleaning existing vendors, inventory, and default users to prevent unique constraints...")
        db.query(Inventory).delete()
        db.query(Vendor).delete()
        # Delete vendor users and the default testing accounts
        db.query(User).filter(User.role == UserRole.VENDOR).delete()
        db.query(User).filter(User.email.in_(["admin@empathi.com", "user@empathi.com"])).delete()
        db.commit()
        print("Existing marketplace and user tables pruned successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error during marketplace table pruning: {e}")
        db.close()
        return

    try:
        # Create default Admin
        admin = User(
            email="admin@empathi.com",
            name="System Admin",
            password_hash=get_password_hash("admin_pass"),
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)

        # Create default Requester
        requester = User(
            email="user@empathi.com",
            name="Alex Carter",
            password_hash=get_password_hash("user_pass"),
            role=UserRole.REQUESTER,
            is_active=True,
            city="Navi Mumbai",
            lat=19.0760,
            lng=72.8777
        )
        db.add(requester)
        db.commit()

        locations = [
            {"city": "Navi Mumbai", "area": "Vashi", "lat": 19.0745, "lng": 72.9978},
            {"city": "Navi Mumbai", "area": "Belapur", "lat": 19.0178, "lng": 73.0397},
            {"city": "Navi Mumbai", "area": "Kharghar", "lat": 19.0213, "lng": 73.0783},
            {"city": "Navi Mumbai", "area": "Nerul", "lat": 19.0330, "lng": 73.0176},
            {"city": "Navi Mumbai", "area": "Seawoods", "lat": 19.0171, "lng": 73.0186},
            {"city": "Navi Mumbai", "area": "Kopar Khairane", "lat": 19.0988, "lng": 73.0076},
            {"city": "Navi Mumbai", "area": "Airoli", "lat": 19.1579, "lng": 72.9935},
            {"city": "Navi Mumbai", "area": "Panvel", "lat": 18.9894, "lng": 73.1175},
            {"city": "Navi Mumbai", "area": "Sanpada", "lat": 19.0645, "lng": 73.0097},
            {"city": "Navi Mumbai", "area": "Ghansoli", "lat": 19.1254, "lng": 73.0125}
        ]

        categories = [
            "Medical Equipment", 
            "Pharmaceuticals", 
            "Blood Bank", 
            "Diagnostic Tools", 
            "Emergency Kits", 
            "Global Logistics"
        ]

        shop_names = [
            "Lifeline Med Solutions", "Navi Pharma Hub", "Red Cross Blood Point", 
            "Precision Diagnostics", "QuickResponse Kits", "Global Med Logistics",
            "Apex Healthcare", "Metro Medicals", "Unity Blood Center", "Rapid Relief Supplies"
        ]

        images = [
            "https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?w=800&h=500&fit=crop", # Medical Equipment
            "https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=800&h=500&fit=crop", # Pharmaceuticals
            "https://images.unsplash.com/photo-1615461066870-40b124f2a784?w=800&h=500&fit=crop", # Blood Bank
            "https://images.unsplash.com/photo-1579152163273-917ad0a13dc4?w=800&h=500&fit=crop", # Diagnostic Tools
            "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=800&h=500&fit=crop", # Emergency Kits
            "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=500&fit=crop", # Global Logistics
            "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&h=500&fit=crop", # Medical Equipment (2)
            "https://images.unsplash.com/photo-1631549916768-4119b255f946?w=800&h=500&fit=crop", # Pharmaceuticals (2)
            "https://images.unsplash.com/photo-1536856136534-bb348c263cc4?w=800&h=500&fit=crop", # Blood Bank (2)
            "https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=800&h=500&fit=crop"  # Emergency Kits (2)
        ]


        for i in range(10):
            email = f"vendor{i+1}@empathi.com"
            full_name = f"Vendor User {i+1}"
            
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(
                    email=email,
                    name=full_name,
                    password_hash=get_password_hash("vendor_pass"),
                    role=UserRole.VENDOR,
                    is_active=True,
                    can_switch_role=True
                )
                db.add(user)
                db.flush()
            
            loc = locations[i]
            cat = categories[i % len(categories)]
            shop = shop_names[i]
            img = images[i]
            
            vendor = Vendor(
                user_id=user.id,
                shop_name=shop,
                category=cat,
                city=loc['city'],
                area=loc['area'],
                lat=loc['lat'],
                lng=loc['lng'],
                rating=round(random.uniform(4.0, 5.0), 1),
                total_completed_orders=random.randint(50, 1000),
                reliability_score=round(random.uniform(0.85, 0.99), 2),
                is_active=True,
                verification_status=VerificationStatus.VERIFIED,
                avg_response_time=random.randint(10, 45),
                image_url=img
            )
            db.add(vendor)
            db.flush()
            
            # Add inventory
            if cat == "Medical Equipment":
                items = [("Oxygen Cylinder", 1500), ("Pulse Oximeter", 800), ("Wheelchair", 5500)]
            elif cat == "Pharmaceuticals":
                items = [("Paracetamol", 50), ("Insulin", 1200), ("Amoxicillin", 200)]
            elif cat == "Blood Bank":
                items = [("O+ Blood Bag", 3000), ("A- Blood Bag", 4500), ("Plasma", 8000)]
            elif cat == "Diagnostic Tools":
                items = [("Glucometer", 1200), ("BP Monitor", 2500), ("Digital Thermometer", 450)]
            elif cat == "Emergency Kits":
                items = [("Trauma Kit", 3500), ("Basic First Aid", 850), ("Burn Care Kit", 1200)]
            else: # Logistics
                items = [("Cold Chain Box", 5000), ("Med-Safe Container", 15000), ("Emergency Transport", 2500)]
                
            for item_name, price in items:
                inv = Inventory(
                    vendor_id=vendor.id,
                    resource_name=item_name,
                    category=cat,
                    quantity=random.randint(10, 100),
                    price=price,
                    reorder_level=5,
                    description=f"High quality {item_name} available at {shop}.",
                    image_url=f"https://images.unsplash.com/photo-{1500000000000 + (hash(item_name) % 1000000)}?auto=format&fit=crop&w=400&q=80"
                )
                db.add(inv)
        
        db.commit()
        print("Marketplace seeded successfully with 10 vendors in Navi Mumbai!")
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
