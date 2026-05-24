import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine
from sqlalchemy import text

def run():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS category_id INTEGER;"))
            print("Successfully added category_id column.")
        except Exception as e:
            print(f"Error adding category_id: {e}")

        try:
            conn.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS subcategory_id INTEGER;"))
            print("Successfully added subcategory_id column.")
        except Exception as e:
            print(f"Error adding subcategory_id: {e}")

if __name__ == "__main__":
    run()
