import sqlite3

def normalize_roles():
    conn = sqlite3.connect('avre.db')
    cursor = conn.cursor()
    
    # Check current roles
    cursor.execute("SELECT id, role FROM users")
    rows = cursor.fetchall()
    
    print(f"Checking {len(rows)} users...")
    updates = 0
    for user_id, role in rows:
        if role and role != role.lower():
            cursor.execute("UPDATE users SET role = ? WHERE id = ?", (role.lower(), user_id))
            updates += 1
    
    conn.commit()
    print(f"Updated {updates} users to lowercase roles.")
    
    # Verify
    cursor.execute("SELECT DISTINCT role FROM users")
    roles = cursor.fetchall()
    print(f"Current unique roles in DB: {[r[0] for r in roles]}")
    
    conn.close()

if __name__ == "__main__":
    normalize_roles()
