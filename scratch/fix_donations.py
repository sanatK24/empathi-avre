import sqlite3
import os

db_path = 'empathi.db'

def fix_donation_statuses():
    if not os.path.exists(db_path):
        print(f"Error: {db_path} not found.")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check for lowercase 'completed'
        cursor.execute("SELECT id, status FROM donations WHERE status = 'completed';")
        rows = cursor.fetchall()
        
        if rows:
            print(f"Found {len(rows)} donations with lowercase 'completed' status. Fixing...")
            cursor.execute("UPDATE donations SET status = 'COMPLETED' WHERE status = 'completed';")
            conn.commit()
            print("Donations fixed successfully.")
        else:
            print("No lowercase 'completed' statuses found in donations table.")
            
        conn.close()
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    fix_donation_statuses()
