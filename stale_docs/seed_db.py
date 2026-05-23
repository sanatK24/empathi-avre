import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add current directory to path so we can import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import settings
from database import Base, SessionLocal
from models import User, Vendor, Inventory, Request, Match, AuditLog
from seed.generate_data import DataGenerator

def seed_database(scale="small"):
    print(f"🌱 Seeding database (scale: {scale})...")
    db = SessionLocal()
    gen = DataGenerator(scale=scale)
    
    try:
        # 1. Generate and add Users
        print("Generating users...")
        user_data = gen.generate_users()
        users = []
        for u in user_data:
            user = User(**u)
            db.add(user)
        db.commit()
        
        # Refresh to get IDs
        all_users = db.query(User).all()
        requester_ids = [u.id for u in all_users if u.role == "requester"]
        vendor_user_ids = [u.id for u in all_users if u.role == "vendor"]
        
        # 2. Generate and add Vendors
        print("Generating vendors...")
        vendor_data = gen.generate_vendors(vendor_user_ids)
        vendors = []
        for v in vendor_data:
            vendor = Vendor(**v)
            db.add(vendor)
        db.commit()
        
        all_vendors = db.query(Vendor).all()
        
        # 3. Generate and add Inventory
        print("Generating inventory...")
        # We need a custom loop because generator expects dicts with 'id'
        vendor_dicts = [{"id": v.id, "category": v.category} for v in all_vendors]
        inventory_data = gen.generate_inventory(vendor_dicts)
        for i in inventory_data:
            inv = Inventory(**i)
            db.add(inv)
        db.commit()
        
        # 4. Generate and add Requests
        print("Generating requests...")
        request_data = gen.generate_requests(requester_ids)
        for r in request_data:
            req = Request(**r)
            db.add(req)
        db.commit()
        
        all_requests = db.query(Request).all()
        
        # 5. Generate and add Matches
        print("Generating matches...")
        request_dicts = [{"id": r.id, "category": r.category, "city": r.city, "status": r.status, "created_at": r.created_at} for r in all_requests]
        match_data = gen.generate_matches(request_dicts, vendor_dicts)
        for m in match_data:
            match = Match(**m)
            db.add(match)
        db.commit()
        
        print("✅ Seeding complete!")
        
    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Seed the EmpathI database")
    parser.add_argument("--scale", type=str, default="small", choices=["small", "medium", "large"], help="Scale of data generation")
    args = parser.parse_args()
    
    seed_database(scale=args.scale)
