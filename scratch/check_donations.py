import sqlite3

conn = sqlite3.connect("empathi.db")
cursor = conn.cursor()

# Get donations for John Doe
cursor.execute("""
    SELECT d.id, d.amount, d.status, c.title, d.created_at 
    FROM donations d 
    LEFT JOIN campaigns c ON d.campaign_id = c.id 
    WHERE d.user_id = 45
""")
donations = cursor.fetchall()
print(f"Total donations in DB for John Doe: {len(donations)}")
for d in donations:
    print(f"ID {d[0]}: ₹{d[1]} - Status: {d[2]} - Campaign: '{d[3]}' - Date: {d[4]}")

conn.close()
