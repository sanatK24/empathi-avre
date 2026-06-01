import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine
from sqlalchemy import text

def fix_userrole_enum():
    """Add missing values to userrole enum in PostgreSQL"""
    with engine.begin() as conn:
        try:
            # Add USER value if it doesn't exist
            conn.execute(text("""
                ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'USER'
            """))
            print("✓ Added 'USER' to userrole enum")
        except Exception as e:
            print(f"Note: {e}")

        try:
            # Add CREATOR value if it doesn't exist
            conn.execute(text("""
                ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'CREATOR'
            """))
            print("✓ Added 'CREATOR' to userrole enum")
        except Exception as e:
            print(f"Note: {e}")

        try:
            # Add REQUESTER value if it doesn't exist
            conn.execute(text("""
                ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'REQUESTER'
            """))
            print("✓ Added 'REQUESTER' to userrole enum")
        except Exception as e:
            print(f"Note: {e}")

        try:
            # Add DONOR value if it doesn't exist
            conn.execute(text("""
                ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'DONOR'
            """))
            print("✓ Added 'DONOR' to userrole enum")
        except Exception as e:
            print(f"Note: {e}")

        try:
            # Add VENDOR value if it doesn't exist
            conn.execute(text("""
                ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'VENDOR'
            """))
            print("✓ Added 'VENDOR' to userrole enum")
        except Exception as e:
            print(f"Note: {e}")

        try:
            # Add ADMIN value if it doesn't exist
            conn.execute(text("""
                ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'ADMIN'
            """))
            print("✓ Added 'ADMIN' to userrole enum")
        except Exception as e:
            print(f"Note: {e}")

if __name__ == "__main__":
    fix_userrole_enum()
    print("\nEnum fix complete!")
