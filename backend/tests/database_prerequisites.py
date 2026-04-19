"""
Database prerequisite checker - ensures all required tables, enums, and relationships exist
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from database import Base
from models import (
    User, Vendor, Inventory, Request, Match, AuditLog, ScoringConfig,
    Campaign, Donation, CampaignUpdate, UserRole, CampaignStatus
)

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_database_setup():
    """Verify all required tables exist and have correct structure"""

    print("\n" + "="*60)
    print("DATABASE PREREQUISITE CHECK")
    print("="*60)

    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("[OK] All tables created/verified")

    # Check table structure
    inspector = inspect(engine)
    required_tables = {
        'users': ['id', 'name', 'email', 'password_hash', 'role', 'is_active'],
        'campaigns': ['id', 'created_by', 'title', 'description', 'category', 'city', 'goal_amount', 'status', 'verified'],
        'donations': ['id', 'campaign_id', 'user_id', 'amount', 'status'],
        'campaign_updates': ['id', 'campaign_id', 'title', 'content'],
        'audit_logs': ['id', 'user_id', 'action', 'resource_type', 'timestamp']
    }

    for table_name, required_columns in required_tables.items():
        if table_name not in inspector.get_table_names():
            print(f"[FAIL] Missing table: {table_name}")
            continue

        existing_columns = [col['name'] for col in inspector.get_columns(table_name)]
        missing_columns = [col for col in required_columns if col not in existing_columns]

        if missing_columns:
            print(f"[FAIL] Table {table_name} missing columns: {missing_columns}")
        else:
            print(f"[OK] Table {table_name} has all required columns")

    # Check admin user exists in test database
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if not admin:
            print("[WARN] No admin user found - tests will need to create one")
        else:
            print(f"[OK] Admin user exists: {admin.email}")
    finally:
        db.close()

    print("="*60)
    print("Database setup complete!\n")

def setup_test_prerequisites():
    """Create test data prerequisites"""
    db = SessionLocal()
    try:
        # Create admin user for tests
        admin = db.query(User).filter(User.email == 'test.admin@example.com').first()
        if not admin:
            from auth import get_password_hash
            admin = User(
                name='Test Admin',
                email='test.admin@example.com',
                password_hash=get_password_hash('testpass123!'),
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            db.commit()
            print("[OK] Created test admin user")
        else:
            # Update role to ADMIN if needed
            if admin.role != UserRole.ADMIN:
                admin.role = UserRole.ADMIN
                db.commit()
                print(f"[OK] Updated {admin.email} role to ADMIN")

        # Create requester user
        requester = db.query(User).filter(User.email == 'test.requester@example.com').first()
        if not requester:
            from auth import get_password_hash
            requester = User(
                name='Test Requester',
                email='test.requester@example.com',
                password_hash=get_password_hash('testpass123!'),
                role=UserRole.REQUESTER,
                is_active=True
            )
            db.add(requester)
            db.commit()
            print("[OK] Created test requester user")

    except Exception as e:
        print(f"[FAIL] Error setting up prerequisites: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_database_setup()
    setup_test_prerequisites()

