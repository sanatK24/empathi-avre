import random
from datetime import datetime, timedelta
from faker import Faker
import uuid
import json
import bcrypt

# Configuration
fake = Faker(['en_IN'])

INDIAN_CITIES = {
    "Mumbai": {"lat": 19.0760, "lng": 72.8777, "pincodes": ["400001", "400002", "400003"]},
    "Pune": {"lat": 18.5204, "lng": 73.8567, "pincodes": ["411001", "411002", "411003"]},
    "Delhi": {"lat": 28.6139, "lng": 77.2090, "pincodes": ["110001", "110002", "110003"]},
    "Bengaluru": {"lat": 12.9716, "lng": 77.5946, "pincodes": ["560001", "560002", "560003"]},
    "Hyderabad": {"lat": 17.3850, "lng": 78.4867, "pincodes": ["500001", "500002", "500003"]},
    "Chennai": {"lat": 13.0827, "lng": 80.2707, "pincodes": ["600001", "600002", "600003"]},
    "Ahmedabad": {"lat": 23.0225, "lng": 72.5714, "pincodes": ["380001", "380002", "380003"]},
    "Kolkata": {"lat": 22.5726, "lng": 88.3639, "pincodes": ["700001", "700002", "700003"]},
    "Jaipur": {"lat": 26.9124, "lng": 75.7873, "pincodes": ["302001", "302002", "302003"]},
    "Lucknow": {"lat": 26.8467, "lng": 80.9462, "pincodes": ["226001", "226002", "226003"]}
}

CATEGORIES = {
    "Pharmacy": ["Paracetamol", "Amoxicillin", "Insulin", "Cough Syrup", "Vitamin C"],
    "Grocery": ["Rice", "Wheat Flour", "Sugar", "Cooking Oil", "Pulses"],
    "Medical Supplier": ["Oxygen Cylinder", "Stretcher", "Wheelchair", "First Aid Kit", "Masks"],
    "Oxygen Supplier": ["10L Oxygen Tank", "47L Oxygen Tank", "Oxygen Flow Meter", "Nasal Cannula"],
    "Food Distributor": ["Meal Kits", "Canned Goods", "Fresh Vegetables", "Drinking Water Bags"],
    "Relief Supplier": ["Blankets", "Tents", "Solar Lamps", "Sanitary Kits"],
    "General Store": ["Batteries", "Soap", "Toothpaste", "Flashlights"]
}

DEFAULT_PASSWORD = "Password123"
# Hash once for efficiency
HASHED_PASSWORD = bcrypt.hashpw(DEFAULT_PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def get_random_coords(city_name):
    city = INDIAN_CITIES[city_name]
    # Add minor jitter for realism
    lat = city["lat"] + random.uniform(-0.05, 0.05)
    lng = city["lng"] + random.uniform(-0.05, 0.05)
    return lat, lng

class DataGenerator:
    def __init__(self, scale="small"):
        self.scale = scale
        self.counts = {
            "small": {"users": 20, "vendors": 10, "requests": 30},
            "medium": {"users": 100, "vendors": 50, "requests": 150},
            "large": {"users": 500, "vendors": 200, "requests": 800}
        }[scale]
        
    def generate_users(self):
        users = []
        # Admins
        for i in range(2):
            city = random.choice(list(INDIAN_CITIES.keys()))
            users.append({
                "name": f"Admin {i+1}",
                "email": f"admin{i+1}@avre.in",
                "password_hash": HASHED_PASSWORD,
                "role": "admin",
                "phone": f"+91-{random.randint(7000000000, 9999999999)}",
                "city": city,
                "is_active": True,
                "created_at": datetime.now() - timedelta(days=random.randint(30, 100))
            })
            
        # Requesters and Vendors
        for i in range(self.counts["users"]):
            name = fake.name()
            email = fake.email()
            role = random.choice(["requester", "vendor"])
            city = random.choice(list(INDIAN_CITIES.keys()))
            users.append({
                "name": name,
                "email": email,
                "password_hash": HASHED_PASSWORD,
                "role": role,
                "phone": f"+91-{random.randint(7000000000, 9999999999)}",
                "city": city,
                "is_active": True,
                "created_at": datetime.now() - timedelta(days=random.randint(1, 90))
            })
        return users

    def generate_vendors(self, user_ids):
        vendors = []
        for uid in user_ids:
            city = random.choice(list(INDIAN_CITIES.keys()))
            lat, lng = get_random_coords(city)
            category = random.choice(list(CATEGORIES.keys()))
            vendors.append({
                "user_id": uid,
                "shop_name": f"{fake.company()} {category}",
                "category": category,
                "lat": lat,
                "lng": lng,
                "city": city,
                "rating": round(random.uniform(3.0, 5.0), 1),
                "reliability_score": round(random.uniform(0.7, 1.0), 2),
                "avg_response_time": random.randint(5, 45),
                "service_radius": random.uniform(5.0, 25.0),
                "verification_status": random.choice(["verified", "verified", "pending"]),
                "opening_hours": "09:00-21:00",
                "is_active": True,
                "total_completed_orders": random.randint(0, 500),
                "fairness_penalty": 0.0,
                "created_at": datetime.now() - timedelta(days=random.randint(10, 80))
            })
        return vendors

    def generate_inventory(self, vendor_list):
        inventory = []
        for vendor in vendor_list:
            items = CATEGORIES[vendor["category"]]
            # Generate 3-7 items per vendor
            num_items = random.randint(3, 7)
            selected_items = random.sample(items, min(num_items, len(items)))
            for item in selected_items:
                quantity = random.randint(20, 100)
                inventory.append({
                    "vendor_id": vendor["id"],
                    "resource_name": item,
                    "category": vendor["category"],
                    "sku_code": f"SKU-{uuid.uuid4().hex[:8].upper()}",
                    "brand_name": fake.company(),
                    "quantity": quantity,
                    "reserved_quantity": random.randint(0, 5),
                    "reorder_level": 10,
                    "price": float(random.randint(50, 5000)),
                    "expiry_date": datetime.now() + timedelta(days=random.randint(30, 365)),
                    "updated_at": datetime.now()
                })
        return inventory

    def generate_requests(self, requester_ids):
        requests = []
        for _ in range(self.counts["requests"]):
            uid = random.choice(requester_ids)
            city = random.choice(list(INDIAN_CITIES.keys()))
            lat, lng = get_random_coords(city)
            category = random.choice(list(CATEGORIES.keys()))
            resource = random.choice(CATEGORIES[category])
            
            created_at = datetime.now() - timedelta(days=random.randint(0, 30))
            status = random.choice(["pending", "matched", "accepted", "completed", "cancelled"])
            
            requests.append({
                "user_id": uid,
                "resource_name": resource,
                "category": category,
                "quantity": random.randint(1, 10),
                "location_lat": lat,
                "location_lng": lng,
                "city": city,
                "urgency_level": random.choice(["low", "medium", "high", "critical"]),
                "preferred_eta": random.randint(30, 240),
                "notes": f"Need {resource} urgently for home use.",
                "special_instructions": "Please call before arriving.",
                "status": status,
                "requester_rating": round(random.uniform(4.0, 5.0), 1),
                "payment_mode": random.choice(["cod", "online"]),
                "fulfilled_at": created_at + timedelta(hours=random.randint(1, 12)) if status == "completed" else None,
                "created_at": created_at
            })
        return requests

    def generate_matches(self, requests, vendors):
        matches = []
        for req in requests:
            # Pick 2-5 vendors in same category and city
            eligible_vendors = [v for v in vendors if v["category"] == req["category"] and v["city"] == req["city"]]
            if not eligible_vendors:
                eligible_vendors = [v for v in vendors if v["category"] == req["category"]]
            
            selected_vendors = random.sample(eligible_vendors, min(len(eligible_vendors), random.randint(2, 5)))
            
            for v in selected_vendors:
                ml_score = random.uniform(0.6, 0.95)
                rule_score = random.uniform(0.5, 0.9)
                score = (ml_score * 0.6) + (rule_score * 0.4)
                
                matches.append({
                    "request_id": req["id"],
                    "vendor_id": v["id"],
                    "score": round(score, 4),
                    "ml_score": round(ml_score, 4),
                    "rule_score": round(rule_score, 4),
                    "explanation_json": json.dumps({
                        "distance_km": round(random.uniform(0.5, 10.0), 2),
                        "stock_availability": "High",
                        "vendor_rating": v["rating"]
                    }),
                    "response_eta": random.randint(15, 60),
                    "selected_flag": True if req["status"] in ["accepted", "completed"] and random.random() > 0.5 else False,
                    "status": "pending",
                    "created_at": req["created_at"] + timedelta(minutes=random.randint(1, 20))
                })
        return matches

    def generate_audit_logs(self, users):
        logs = []
        for _ in range(self.counts["requests"] * 2):
            user = random.choice(users)
            logs.append({
                "user_id": user.get("id"),
                "actor_role": user["role"],
                "action": random.choice(["login", "create_request", "update_inventory", "accept_match"]),
                "resource_type": random.choice(["request", "inventory", "match", "user"]),
                "severity": random.choice(["info", "info", "warning"]),
                "ip_address": f"192.168.1.{random.randint(1, 254)}",
                "trace_id": uuid.uuid4().hex,
                "details": "Action performed successfully.",
                "timestamp": datetime.now() - timedelta(minutes=random.randint(1, 43200))
            })
        return logs

if __name__ == "__main__":
    gen = DataGenerator(scale="medium")
    print("Generation Logic Ready. Use seed scripts to populate DB.")
