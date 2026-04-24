import sqlite3
import os

db_path = os.path.join('empathi.db')
if os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM campaigns")
        rows = cursor.fetchall()
        print(rows)
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")
else:
    print(f"❌ Database not found at {db_path}")
