import sqlite3
from datetime import datetime

def setup_sanat_vendor():
    conn = sqlite3.connect('avre.db')
    cursor = conn.cursor()

    # 1. Create User
    name = "Sanat Karkhanis"
    email = "sanat@avre.in"
    password_hash = "$2b$12$qGLVKmnlPhnyteI0RIwKCe4jbeNUlPPNYskRlUUzi3FKtnmA9RPuS" # Same as others
    role = "vendor"
    phone = "+91-9999999999"
    city = "Mumbai"
    is_active = 1
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
        INSERT INTO users (name, email, password_hash, role, phone, city, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (name, email, password_hash, role, phone, city, is_active, created_at))
    
    user_id = cursor.lastrowid
    print(f"Created user {name} with ID: {user_id}")

    # 2. Create Vendor
    shop_name = "Sanat Medical Supplies"
    cursor.execute("""
        INSERT INTO vendors (user_id, shop_name, category, lat, lng, city, rating, reliability_score, avg_response_time, service_radius, verification_status, is_active, total_completed_orders, fairness_penalty, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, shop_name, "Medical", 19.0760, 72.8777, city, 4.8, 0.95, 15, 10.0, "Verified", 1, 42, 0.0, created_at))
    
    vendor_id = cursor.lastrowid
    print(f"Created vendor entry with ID: {vendor_id}")

    # 3. Add Inventory
    inventory_items = [
        ("Surgical Masks (N95)", "Safety", "MASK-N95-001", "3M", 5000, 0, 500, 25.0, "2027-12-31 00:00:00"),
        ("Latex Gloves (S)", "Consumables", "GLV-S-001", "SafeGuard", 1200, 0, 200, 15.0, "2026-12-31 00:00:00"),
        ("Oxygen Concentrator 5L", "Emergency", "OXY-C-M1", "Philips", 15, 0, 2, 45000.0, "2030-01-01 00:00:00"),
        ("Saline Solution 500ml", "Pharma", "SAL-500", "Baxter", 240, 0, 50, 45.0, "2025-06-30 00:00:00"),
        ("Blood Pressure Monitor", "Diagnostics", "BPM-D-01", "Omron", 30, 0, 5, 2500.0, "2028-12-31 00:00:00"),
    ]

    for item in inventory_items:
        cursor.execute("""
            INSERT INTO inventory (vendor_id, resource_name, category, sku_code, brand_name, quantity, reserved_quantity, reorder_level, price, expiry_date, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (vendor_id, *item, created_at))
    
    print(f"Added {len(inventory_items)} inventory items.")

    # 4. Add some requests and matches
    # Let's find some existing requests to match with
    cursor.execute("SELECT id FROM requests WHERE city = 'Mumbai' LIMIT 3")
    requests = cursor.fetchall()
    
    for req in requests:
        req_id = req[0]
        cursor.execute("""
            INSERT INTO matches (request_id, vendor_id, score, ml_score, rule_score, explanation_json, response_eta, selected_flag, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (req_id, vendor_id, 98.5, 0.98, 0.99, '{"reason": "Closest available stock", "match_quality": "High"}', 10, 0, 'pending', created_at))

    print(f"Created {len(requests)} pending matches.")

    conn.commit()
    conn.close()
    print("Setup complete!")

if __name__ == "__main__":
    setup_sanat_vendor()
