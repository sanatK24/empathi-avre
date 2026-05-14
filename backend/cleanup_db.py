import sys
import os
import argparse

# Add the current directory to path so we can import local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from database import engine, Base
import models # Important: all models must be imported to populate Base.metadata

def cleanup_database():
    """
    Deletes all records from all tables defined in models.py.
    Resets auto-incrementing IDs.
    """
    print(f"Connecting to database: {engine.url.database}")
    
    with engine.connect() as connection:
        # Identify dialect
        is_sqlite = engine.url.drivername.startswith("sqlite")
        
        # Get all table names defined in the app (excludes alembic_version)
        tables = list(Base.metadata.tables.keys())
        
        # Start transaction
        trans = connection.begin()
        try:
            if is_sqlite:
                print("Detected SQLite database.")
                # SQLite: Disable foreign key checks for the session to avoid errors
                connection.execute(text("PRAGMA foreign_keys = OFF"))
                for table in tables:
                    print(f" - Clearing {table}")
                    connection.execute(text(f"DELETE FROM {table}"))
                    # Reset primary key sequence
                    connection.execute(text(f"DELETE FROM sqlite_sequence WHERE name='{table}'"))
                connection.execute(text("PRAGMA foreign_keys = ON"))
            else:
                print("Detected PostgreSQL/Other database.")
                # PostgreSQL/Standard SQL approach using TRUNCATE CASCADE
                # We do this in a single command or one by one
                for table in tables:
                    print(f" - Truncating {table}")
                    # RESTART IDENTITY resets auto-increment counters
                    # CASCADE handles foreign key dependencies
                    connection.execute(text(f'TRUNCATE TABLE "{table}" RESTART IDENTITY CASCADE'))
            
            trans.commit()
            print("\n✅ Database cleanup completed successfully. All records deleted.")
        except Exception as e:
            trans.rollback()
            print(f"\n❌ Error during cleanup: {e}")
            sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Cleanup all records from the database.")
    parser.add_argument("--force", action="store_true", help="Skip confirmation prompt (useful for deployment)")
    args = parser.parse_args()

    # Check for force flag or environment variable
    force_env = os.getenv("FORCE_CLEANUP", "false").lower() == "true"
    
    if args.force or force_env:
        cleanup_database()
    else:
        print("⚠️  WARNING: This will DELETE ALL RECORDS from the database.")
        confirm = input("Type 'DELETE' to confirm: ")
        if confirm == "DELETE":
            cleanup_database()
        else:
            print("Cleanup cancelled.")
