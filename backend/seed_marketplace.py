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
    # Complete database reset
    try:
        # Import all models to ensure they are registered with Base.metadata
        from models import Base
        Base.metadata.drop_all(bind=engine)
        print("Dropped all existing tables.")
        Base.metadata.create_all(bind=engine)
        print("Database tables re-initialized from scratch.")
    except Exception as e:
        print(f"Error during database reset: {e}")
        return

    db = SessionLocal()
    
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
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSyZi1iLUycABLQcdyWhSp4EKRlPmodn-3UOua5nlTBFPTpdgtdVl5GONg0&s",
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRHGhDhIezpf2GB9V4z2gP1-OxyF96Egr2Hc-R4fDXTAhWelcbGrFKUBLOM&s",
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSsgO4VB6v31wC5r5YdzyG6ATuZMSiFr3_19y6TWPIWyKp26XVFKwZlJQl7&s",
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_76wRX8OfW8G_DoqbDpRNM6GHyn8-EVjK7Zkt1LFer1DG1_lvFuy9V85D&s",
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQy6Bx-0B2CZRrej4TB3T7r_dUtzb7JvqrJd7OHENl6AGyFuBtAuhldk5x5&s",
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSyZi1iLUycABLQcdyWhSp4EKRlPmodn-3UOua5nlTBFPTpdgtdVl5GONg0&s",
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRHGhDhIezpf2GB9V4z2gP1-OxyF96Egr2Hc-R4fDXTAhWelcbGrFKUBLOM&s",
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSsgO4VB6v31wC5r5YdzyG6ATuZMSiFr3_19y6TWPIWyKp26XVFKwZlJQl7&s",
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_76wRX8OfW8G_DoqbDpRNM6GHyn8-EVjK7Zkt1LFer1DG1_lvFuy9V85D&s",
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQy6Bx-0B2CZRrej4TB3T7r_dUtzb7JvqrJd7OHENl6AGyFuBtAuhldk5x5&s"
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
