import sqlite3
import os

db_path = 'empathi.db'

def update_db():
    if not os.path.exists(db_path):
        print(f"Error: {db_path} not found.")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if column exists
        cursor.execute("PRAGMA table_info(users);")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'can_switch_role' not in columns:
            print("Adding column 'can_switch_role' to 'users' table...")
            cursor.execute("ALTER TABLE users ADD COLUMN can_switch_role BOOLEAN DEFAULT 0;")
            conn.commit()
            print("Column added successfully.")
        else:
            print("Column 'can_switch_role' already exists.")
            
        conn.close()
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    update_db()
