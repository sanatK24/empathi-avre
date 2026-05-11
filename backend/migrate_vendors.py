import sqlite3
import os

def migrate():
    db_path = 'backend/empathi.db'
    if not os.path.exists(db_path):
        print("Database not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute("ALTER TABLE vendors ADD COLUMN area VARCHAR")
        print("Added column 'area' to vendors table.")
    except sqlite3.OperationalError:
        print("Column 'area' already exists in vendors table.")

    conn.commit()
    conn.close()
    print("Vendor migration completed.")

if __name__ == "__main__":
    migrate()
