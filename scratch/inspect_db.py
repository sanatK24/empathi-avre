import sqlite3
import os

db_path = 'empathi.db'
if not os.path.exists(db_path):
    print(f"{db_path} does not exist")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"Tables in {db_path}: {tables}")
    if ('users',) in tables:
        cursor.execute("PRAGMA table_info(users);")
        columns = cursor.fetchall()
        print(f"Columns in users table: {[c[1] for c in columns]}")
    conn.close()
