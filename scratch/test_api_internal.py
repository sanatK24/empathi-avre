import sys
import os
from fastapi.testclient import TestClient

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from main import app
from database import SessionLocal
from models import User
from services.auth_service import AuthService

def test_api():
    db = SessionLocal()
    try:
        # Find John Doe
        john = db.query(User).filter(User.name == "John Doe").first()
        if not john:
            print("John Doe not found in database!")
            return
            
        print(f"John Doe User ID: {john.id}, Role: {john.role}, Email: {john.email}")
        
        # Create a real JWT token for John Doe
        token_data = AuthService.create_token_response(john)
        token = token_data["access_token"]
        
        client = TestClient(app)
        headers = {"Authorization": f"Bearer {token}"}
        
        # 1. Profile
        res = client.get("/auth/profile", headers=headers)
        print("\n--- Profile ---")
        print(res.status_code)
        print(res.json())
        
        # 2. Stats
        res = client.get("/requests/stats", headers=headers)
        print("\n--- Stats ---")
        print(res.status_code)
        print(res.json())
        
        # 3. Requests History
        res = client.get("/requests/my", headers=headers)
        print("\n--- Requests History ---")
        print(res.status_code)
        print("Count:", len(res.json()))
        
        # 4. Donations History
        res = client.get("/campaigns/my-donations", headers=headers)
        print("\n--- Donations History ---")
        print(res.status_code)
        donations = res.json()
        print("Count:", len(donations))
        if donations:
            print("Total amount:", sum(d["amount"] for d in donations))
            print("First 5 donations:")
            for d in donations[:5]:
                print(f"  ₹{d['amount']} - {d.get('campaign_title')} - {d.get('created_at')}")
                
        # 5. Recommendations
        res = client.get("/campaigns/recommendations", headers=headers)
        print("\n--- Recommendations ---")
        print(res.status_code)
        print("Count:", len(res.json()))
        
    finally:
        db.close()

if __name__ == "__main__":
    test_api()
