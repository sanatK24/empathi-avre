import sqlite3
import os

def migrate_db(db_path: str):
    if not os.path.exists(db_path):
        print(f"Database not found at: {db_path}")
        return

    print(f"\n--- Migrating database: {db_path} ---")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Helper to check if a column exists
    def column_exists(table_name, column_name):
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = [row[1] for row in cursor.fetchall()]
        return column_name in columns

    # 1. Migrate Matches table
    matches_cols = {
        "lgbm_score": "REAL",
        "fairness_penalty_applied": "REAL",
        "rank_position": "INTEGER"
    }
    for col_name, col_type in matches_cols.items():
        if not column_exists("matches", col_name):
            try:
                cursor.execute(f"ALTER TABLE matches ADD COLUMN {col_name} {col_type}")
                print(f"  Added column matches.{col_name}")
            except sqlite3.OperationalError as e:
                print(f"  Could not add matches.{col_name}: {e}")
        else:
            print(f"  Column matches.{col_name} already exists.")

    # 2. Migrate Vendors table
    vendors_cols = {
        "total_impressions": "INTEGER DEFAULT 0",
        "total_selections": "INTEGER DEFAULT 0"
    }
    for col_name, col_type in vendors_cols.items():
        if not column_exists("vendors", col_name):
            try:
                cursor.execute(f"ALTER TABLE vendors ADD COLUMN {col_name} {col_type}")
                print(f"  Added column vendors.{col_name}")
            except sqlite3.OperationalError as e:
                print(f"  Could not add vendors.{col_name}: {e}")
        else:
            print(f"  Column vendors.{col_name} already exists.")

    # 3. Create Indexes
    try:
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_matches_request_id_score ON matches (request_id, score DESC)")
        print("  Created composite index ix_matches_request_id_score.")
    except Exception as e:
        print(f"  Could not create index ix_matches_request_id_score: {e}")

    try:
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_vendors_fairness_penalty ON vendors (fairness_penalty)")
        print("  Created index ix_vendors_fairness_penalty.")
    except Exception as e:
        print(f"  Could not create index ix_vendors_fairness_penalty: {e}")

    conn.commit()
    conn.close()
    print(f"--- Migration completed for: {db_path} ---")

if __name__ == "__main__":
    # Migrate both the root empathi.db and any sub-dbs in backend/
    dbs_to_migrate = [
        "empathi.db",
        "backend/empathi.db",
        "backend/avre.db",
        "backend/final_smoke_test.db",
        "backend/smoke_test.db"
    ]
    for db in dbs_to_migrate:
        migrate_db(db)
