import sqlite3

def list_vendors():
    conn = sqlite3.connect('avre.db')
    cursor = conn.cursor()
    
    print("--- Searching for users named 'Sanat' ---")
    cursor.execute("SELECT id, name, email, role FROM users WHERE name LIKE '%Sanat%'")
    rows = cursor.fetchall()
    
    if not rows:
        print("No users found with 'Sanat' in their name.")
    else:
        print(f"{'ID':<5} | {'Name':<25} | {'Email':<30} | {'Role':<10}")
        print("-" * 75)
        for row in rows:
            print(f"{row[0]:<5} | {row[1]:<25} | {row[2]:<30} | {row[3]:<10}")
    
    print("\n--- All Vendors in Database ---")
    cursor.execute("SELECT id, name, email, role FROM users WHERE role = 'vendor'")
    rows = cursor.fetchall()
    
    if not rows:
        print("No users with role 'vendor' found.")
    else:
        print(f"{'ID':<5} | {'Name':<25} | {'Email':<30} | {'Role':<10}")
        print("-" * 75)
        for row in rows:
            print(f"{row[0]:<5} | {row[1]:<25} | {row[2]:<30} | {row[3]:<10}")
        
    conn.close()

if __name__ == "__main__":
    list_vendors()
