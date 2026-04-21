import sys
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from database import Base, get_db
from models import User, UserRole, UrgencyLevel, VerificationStatus

# Setup Test DB
SQLALCHEMY_DATABASE_URL = "sqlite:///./final_smoke_test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

def run_smoke_test():
    print("🚀 STARTING EMPATHI FINAL SYSTEM SMOKE TEST")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    results = {"working": [], "broken": [], "notes": []}
    admin_token = None
    vendor_token = None
    user_token = None
    
    # 1. AUTH FLOW (Seeded Admin)
    try:
        print("\n--- 1. AUTH FLOW ---")
        db = TestingSessionLocal()
        from core.security import get_password_hash
        admin_user = User(
            email="admin@empathi.com",
            password_hash=get_password_hash("password123"),
            name="Super Admin",
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        db.close()
        
        res = client.post("/auth/login", data={"username": "admin@empathi.com", "password": "password123"})
        assert res.status_code == 200, f"Login failed: {res.text}"
        admin_token = res.json()["access_token"]
        results["working"].append("Admin Auth (Seeded)")
    except Exception as e:
        results["broken"].append(f"Auth Flow: {str(e)}")

    # 2. VENDOR FLOW
    try:
        print("\n--- 2. VENDOR FLOW ---")
        # Register
        res = client.post("/auth/register", json={
            "email": "vendor@empathi.com",
            "password": "password123",
            "name": "Local Pharma",
            "role": "vendor",
            "city": "Mumbai"
        })
        assert res.status_code == 200
        
        # Login
        res = client.post("/auth/login", data={"username": "vendor@empathi.com", "password": "password123"})
        vendor_token = res.json()["access_token"]
        v_headers = {"Authorization": f"Bearer {vendor_token}"}
        
        # MUST CREATE PROFILE FIRST
        res = client.post("/vendor/profile", headers=v_headers, json={
            "shop_name": "Pharma Express",
            "category": "Medical",
            "lat": 19.0760,
            "lng": 72.8777,
            "city": "Mumbai"
        })
        assert res.status_code == 200, f"Profile creation failed: {res.text}"
        
        # Add Inventory
        res = client.post("/inventory", headers=v_headers, json={
            "resource_name": "Oxymeter",
            "category": "Medical",
            "quantity": 50,
            "price": 1200
        })
        assert res.status_code == 200 or res.status_code == 201, f"Inventory failed: {res.text}"
        
        results["working"].append("Vendor Profile & Inventory")
    except Exception as e:
        results["broken"].append(f"Vendor Flow: {str(e)}")

    # 3. REQUEST & MATCHING
    try:
        print("\n--- 3. REQUEST & MATCHING ---")
        client.post("/auth/register", json={
            "email": "user@empathi.com",
            "password": "password123",
            "name": "Test User",
            "role": "requester",
            "city": "Mumbai"
        })
        res = client.post("/auth/login", data={"username": "user@empathi.com", "password": "password123"})
        user_token = res.json()["access_token"]
        u_headers = {"Authorization": f"Bearer {user_token}"}
        
        res = client.post("/requests", headers=u_headers, json={
            "resource_name": "Oxymeter",
            "category": "Medical",
            "quantity": 2,
            "urgency_level": "high",
            "location_lat": 19.0800,
            "location_lng": 72.8800,
            "city": "Mumbai"
        })
        assert res.status_code == 200 or res.status_code == 201
        req_id = res.json()["id"]
        
        res = client.get(f"/requests/{req_id}/matches", headers=u_headers)
        assert res.status_code == 200
        matches = res.json()
        assert len(matches) > 0, "No matches found for created inventory"
        
        results["working"].append("ML Matching & Ranking")
    except Exception as e:
        results["broken"].append(f"Request Flow: {str(e)}")

    # 4. CAMPAIGN FLOW
    try:
        print("\n--- 4. CAMPAIGN FLOW ---")
        res = client.post("/campaigns", headers=u_headers, json={
            "title": "Save the Forest",
            "description": "Planting 1000 trees across the city.",
            "category": "Environment",
            "city": "Mumbai",
            "goal_amount": 50000,
            "urgency_level": "medium"
        })
        assert res.status_code == 200 or res.status_code == 201
        camp_id = res.json()["id"]
        
        results["working"].append("Campaign Lifecycle")
    except Exception as e:
        results["broken"].append(f"Campaign Flow: {str(e)}")

    # 5. ADMIN FLOW
    try:
        print("\n--- 5. ADMIN FLOW ---")
        a_headers = {"Authorization": f"Bearer {admin_token}"}
        res = client.get("/admin/stats", headers=a_headers)
        assert res.status_code == 200
        
        results["working"].append("Admin Moderation & Stats")
    except Exception as e:
        results["broken"].append(f"Admin Flow: {str(e)}")

    print("\n--- SMOKE TEST SUMMARY ---")
    print(f"✅ WORKING: {len(results['working'])}")
    for w in results["working"]: print(f"   - {w}")
    print(f"❌ BROKEN: {len(results['broken'])}")
    for b in results["broken"]: print(f"   - {b}")
    
    if not results["broken"]:
        print("\n🏆 SYSTEM STABLE. Ready for deployment!")
    else:
        print("\n⚠️ SYSTEM HAS REGRESSIONS.")

if __name__ == "__main__":
    run_smoke_test()
