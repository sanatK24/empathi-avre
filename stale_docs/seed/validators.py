import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import User, Vendor, Request, Match, Inventory

DATABASE_URL = "sqlite:///../avre.db"

def validate_data():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    print("--- DATA VALIDATION REPORT ---")

    # 1. Admin count
    admin_count = session.query(User).filter(User.role == "admin").count()
    print(f"Admins: {admin_count} (Expected: 2)")
    assert admin_count == 2, f"Failed: Found {admin_count} admins instead of 2."

    # 2. Email Uniqueness
    total_users = session.query(User).count()
    unique_emails = session.query(User.email).distinct().count()
    print(f"Users: {total_users}, Unique Emails: {unique_emails}")
    assert total_users == unique_emails, "Failed: Emails are not unique."

    # 3. Coordinate Checks
    vendors_outside_india = session.query(Vendor).filter(
        (Vendor.lat < 5.0) | (Vendor.lat > 38.0) | (Vendor.lng < 68.0) | (Vendor.lng > 98.0)
    ).count()
    print(f"Vendors outside India bounds: {vendors_outside_india} (Expected: 0)")
    assert vendors_outside_india == 0, "Failed: Coordinates are outside realistic Indian bounds."

    # 4. Foreign Key Integrity
    # Match -> Request
    broken_matches = session.query(Match).filter(~Match.request_id.in_(session.query(Request.id))).count()
    print(f"Broken Match-Request links: {broken_matches} (Expected: 0)")
    assert broken_matches == 0, "Failed: Broken Match-Request foreign keys."

    # Vendor -> User
    broken_vendors = session.query(Vendor).filter(~Vendor.user_id.in_(session.query(User.id))).count()
    print(f"Broken Vendor-User links: {broken_vendors} (Expected: 0)")
    assert broken_vendors == 0, "Failed: Broken Vendor-User foreign keys."

    # 5. Price consistency
    impossible_prices = session.query(Inventory).filter(Inventory.price <= 0).count()
    print(f"Inventory items with zero/negative price: {impossible_prices} (Expected: 0)")
    assert impossible_prices == 0, "Failed: Found impossible prices."

    print("-------------------------------")
    print("ALL VALIDATIONS PASSED!")
    session.close()

if __name__ == "__main__":
    try:
        validate_data()
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)
