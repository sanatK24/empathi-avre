import os
import sys
import argparse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add parent directory to path to import models and database
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Base, User, Vendor, Inventory, Request, Match, AuditLog, ScoringConfig
from config import settings
from seed.generate_data import DataGenerator

# Use same DB URL as the application
DATABASE_URL = settings.DATABASE_URL

def seed_db(scale="small", clear=False):
    engine = create_engine(DATABASE_URL)
    
    if clear:
        print("Clearing existing data...")
        # Order matters for foreign keys
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        print("Existing data cleared.")
    else:
        Base.metadata.create_all(engine)

    Session = sessionmaker(bind=engine)
    session = Session()

    gen = DataGenerator(scale=scale)

    print(f"Generating {scale} dataset...")

    # 1. Users
    user_data = gen.generate_users()
    db_users = [User(**u) for u in user_data]
    session.add_all(db_users)
    session.commit()
    print(f"Inserted {len(db_users)} users.")

    # 2. Vendors
    vendor_user_ids = [u.id for u in db_users if u.role == "vendor"]
    vendor_data = gen.generate_vendors(vendor_user_ids)
    db_vendors = [Vendor(**v) for v in vendor_data]
    session.add_all(db_vendors)
    session.commit()
    print(f"Inserted {len(db_vendors)} vendors.")

    # 3. Inventory
    inventory_data = gen.generate_inventory([
        {"id": v.id, "category": v.category} for v in db_vendors
    ])
    db_inventory = [Inventory(**i) for i in inventory_data]
    session.add_all(db_inventory)
    session.commit()
    print(f"Inserted {len(db_inventory)} inventory items.")

    # 4. Requests
    requester_ids = [u.id for u in db_users if u.role == "requester"]
    request_data = gen.generate_requests(requester_ids)
    db_requests = [Request(**r) for r in request_data]
    session.add_all(db_requests)
    session.commit()
    print(f"Inserted {len(db_requests)} requests.")

    # 5. Matches
    # Need to pass generated objects to pick valid IDs
    match_data = gen.generate_matches(
        [{"id": r.id, "category": r.category, "city": r.city, "status": r.status, "created_at": r.created_at} for r in db_requests],
        [{"id": v.id, "category": v.category, "city": v.city, "rating": v.rating} for v in db_vendors]
    )
    db_matches = [Match(**m) for m in match_data]
    session.add_all(db_matches)
    session.commit()
    print(f"Inserted {len(db_matches)} matches.")

    # 6. Audit Logs
    audit_data = gen.generate_audit_logs([
        {"id": u.id, "role": u.role} for u in db_users
    ])
    db_logs = [AuditLog(**l) for l in audit_data]
    session.add_all(db_logs)
    session.commit()
    print(f"Inserted {len(db_logs)} audit logs.")

    # 7. Default Scoring Config
    if not session.query(ScoringConfig).first():
        config = ScoringConfig(
            ml_weight=0.4,
            urgency_weight=0.2,
            fairness_weight=0.1,
            stock_weight=0.2,
            freshness_weight=0.1
        )
        session.add(config)
        session.commit()
        print("Inserted default scoring config.")

    session.close()
    print("Seeding completed successfully!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed the AVRE database with realistic data.")
    parser.add_argument("--scale", type=str, default="small", choices=["small", "medium", "large"], help="Scale of data to generate.")
    parser.add_argument("--clear", action="store_true", help="Clear existing data before seeding.")
    
    args = parser.parse_args()
    seed_db(scale=args.scale, clear=args.clear)
