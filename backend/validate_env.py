import os
import sys
import sqlite3
import importlib

def check_files():
    print("--- FILES & PATHS ---")
    required_files = [
        'main.py', 'models.py', 'database.py', 'schemas.py', 
        'avre.db', 'seed/generate_data.py', 'seed/seed_sqlite.py', 
        'seed/validators.py'
    ]
    all_present = True
    for f in required_files:
        exists = os.path.exists(f)
        status = "PASSED" if exists else "FAILED"
        print(f"[{status}] {f}")
        if not exists:
            all_present = False
    return all_present

def check_db():
    print("\n--- DATABASE READINESS ---")
    if not os.path.exists('avre.db'):
        print("[FAILED] avre.db does not exist.")
        return False
    
    try:
        conn = sqlite3.connect('avre.db')
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [t[0] for t in cursor.fetchall()]
        print(f"[PASSED] Connection successful. Tables: {', '.join(tables)}")
        
        required_tables = ['users', 'vendors', 'inventory', 'requests', 'matches', 'audit_logs']
        for table in required_tables:
            if table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table};")
                count = cursor.fetchone()[0]
                print(f"[PASSED] Table '{table}' found. Rows: {count}")
            else:
                print(f"[FAILED] Table '{table}' is missing.")
        conn.close()
        return True
    except Exception as e:
        print(f"[FAILED] DB Error: {e}")
        return False

def check_deps():
    print("\n--- DEPENDENCIES ---")
    deps = ['fastapi', 'sqlalchemy', 'pydantic', 'faker', 'geopy', 'bcrypt']
    all_good = True
    for dep in deps:
        try:
            importlib.import_module(dep)
            print(f"[PASSED] {dep} installed.")
        except ImportError:
            print(f"[FAILED] {dep} is NOT installed.")
            all_good = False
    return all_good

def check_env():
    print("\n--- ENVIRONMENT ---")
    if os.path.exists('.env'):
        print("[PASSED] .env file exists.")
    else:
        print("[NOTE] .env file missing (may be optional if using defaults).")
    return True

if __name__ == "__main__":
    f_ok = check_files()
    db_ok = check_db()
    dep_ok = check_deps()
    env_ok = check_env()
    
    print("\n====================================================")
    if f_ok and db_ok and dep_ok:
        print("RESULT: READY")
    else:
        print("RESULT: NOT READY")
    print("====================================================")
