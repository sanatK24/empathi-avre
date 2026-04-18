#!/usr/bin/env python
"""
Setup script for E2E test database and users.
Run this once before executing the test suite.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal, Base, engine
from models import User, UserRole
from auth import get_password_hash

def setup_test_database():
    """Create test database and users"""

    print("[*] Setting up test database...")

    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("[OK] Database tables created")

    # Create session
    db = SessionLocal()

    try:
        # Check if test users already exist
        existing_requester = db.query(User).filter(
            User.email == "test.requester@example.com"
        ).first()

        existing_admin = db.query(User).filter(
            User.email == "test.admin@example.com"
        ).first()

        if existing_requester and existing_admin:
            print("[INFO] Test users already exist")
            return True

        # Create test requester
        requester = User(
            name="Test Requester",
            email="test.requester@example.com",
            password_hash=get_password_hash("testpass123!"),
            role=UserRole.REQUESTER,
            is_active=True
        )
        db.add(requester)
        print("[OK] Created test requester (test.requester@example.com)")

        # Create test admin
        admin = User(
            name="Test Admin",
            email="test.admin@example.com",
            password_hash=get_password_hash("testpass123!"),
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)
        print("[OK] Created test admin (test.admin@example.com)")

        # Commit changes
        db.commit()

        print("\n[OK] Test database setup complete!")
        print("\nTest Users Created:")
        print("  - Requester: test.requester@example.com")
        print("  - Password: testpass123!")
        print("  - Admin: test.admin@example.com")
        print("  - Password: testpass123!")
        print("\nYou can now run the tests:")
        print("  pytest tests/ -m api -v")

        return True

    except Exception as e:
        print(f"\n[ERROR] Error setting up database: {str(e)}")
        db.rollback()
        return False

    finally:
        db.close()

if __name__ == "__main__":
    success = setup_test_database()
    sys.exit(0 if success else 1)
