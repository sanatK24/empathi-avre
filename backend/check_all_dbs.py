import sqlite3

def check_db():
    print("--- Database Check ---")
    databases = ['avre.db', 'test.db', 'test_matching.db']
    
    for db_name in databases:
        print(f"\nChecking {db_name}:")
        try:
            conn = sqlite3.connect(db_name)
            cursor = conn.cursor()
            
            # Check if users table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
            if not cursor.fetchone():
                print(f"  No 'users' table in {db_name}")
                continue
                
            cursor.execute("SELECT id, name, email, role FROM users")
            rows = cursor.fetchall()
            if not rows:
                print(f"  'users' table is empty in {db_name}")
            else:
                print(f"  Found {len(rows)} users:")
                for row in rows:
                    print(f"  - ID: {row[0]}, Name: '{row[1]}', Email: '{row[2]}', Role: '{row[3]}'")
            
            conn.close()
        except Exception as e:
            print(f"  Error checking {db_name}: {e}")

if __name__ == "__main__":
    check_db()
