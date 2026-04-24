import sqlite3
import os

db_path = 'empathi.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables:", tables)
    if ('campaigns',) in [t for t in tables]:
        cursor.execute("SELECT COUNT(*) FROM campaigns")
        count = cursor.fetchone()[0]
        print(f"Campaign count: {count}")
        if count > 0:
            cursor.execute("SELECT id, title, status FROM campaigns LIMIT 5")
            rows = cursor.fetchall()
            print("Campaigns:", rows)
    else:
        print("Campaigns table not found")
    conn.close()
else:
    print("DB not found")
