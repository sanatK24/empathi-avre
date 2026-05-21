import sqlite3
import os

db_paths = [
    "c:/Users/sanat/OneDrive/Desktop/PROJECTS/EmpathI/empathi.db",
    "c:/Users/sanat/OneDrive/Desktop/PROJECTS/EmpathI/backend/empathi.db",
    "c:/Users/sanat/OneDrive/Desktop/PROJECTS/EmpathI/backend/avre.db",
    "c:/Users/sanat/OneDrive/Desktop/PROJECTS/EmpathI/backend/final_smoke_test.db",
    "c:/Users/sanat/OneDrive/Desktop/PROJECTS/EmpathI/backend/smoke_test.db",
]

new_columns = [
    ("address_line_1", "VARCHAR(100)"),
    ("address_line_2", "VARCHAR(100)"),
    ("locality", "VARCHAR(60)"),
    ("state_province", "VARCHAR(50)"),
    ("postal_code", "VARCHAR(10)"),
    ("country_code", "VARCHAR(3)")
]

def migrate():
    print("Starting EmpathI Address DB Migrations...")
    for db_path in db_paths:
        if not os.path.exists(db_path):
            print(f"Skipping {db_path} (does not exist)")
            continue
            
        print(f"Migrating database: {db_path}")
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Check existing columns
            cursor.execute("PRAGMA table_info(users)")
            existing_cols = [row[1] for row in cursor.fetchall()]
            
            for col_name, col_type in new_columns:
                if col_name not in existing_cols:
                    print(f"  Adding column {col_name} ({col_type}) to 'users'")
                    cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
                else:
                    print(f"  Column {col_name} already exists in 'users'")
                    
            conn.commit()
            conn.close()
            print(f"Successfully migrated {db_path}")
        except Exception as e:
            print(f"Error migrating {db_path}: {e}")

if __name__ == "__main__":
    migrate()
