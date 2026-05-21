import sqlite3
import os

dbs = ["empathi.db", "backend/empathi.db", "backend/avre.db", "backend/final_smoke_test.db", "backend/smoke_test.db"]
for db_path in dbs:
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        c.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in c.fetchall()]
        print(f"\n--- {db_path} ---")
        print("Tables:", tables)
        if "matches" in tables:
            c.execute("SELECT COUNT(*) FROM matches")
            print("Matches count:", c.fetchone()[0])
        conn.close()
