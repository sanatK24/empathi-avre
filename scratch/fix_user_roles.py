import sqlite3
import os

db_path = 'empathi.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check current roles
    cursor.execute("SELECT DISTINCT role FROM users")
    roles = cursor.fetchall()
    print(f"Current unique roles in DB: {roles}")
    
    # Update 'user' to 'REQUESTER'
    cursor.execute("UPDATE users SET role = 'REQUESTER' WHERE role = 'user'")
    updated = cursor.rowcount
    print(f"Updated {updated} users from 'user' to 'REQUESTER'")
    
    conn.commit()
    conn.close()
else:
    print("DB not found")
