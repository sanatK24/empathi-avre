import pytest
from fastapi.testclient import TestClient
from main import app
from database import Base, get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User, UserRole, Vendor, Inventory, Request as ResourceRequest

# Setup test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_matching.db"
test_engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    
    # Create a requester
    user = User(name="Requester", email="req@test.com", password_hash="hash", role=UserRole.REQUESTER)
    db.add(user)
    
    # Create two vendors
    v1 = Vendor(user_id=1, shop_name="Fast Pharmacy", category="medical", lat=10.0, lng=10.0, city="TestCity", avg_response_time=5, rating=4.8)
    v2 = Vendor(user_id=2, shop_name="Slow Shop", category="medical", lat=10.1, lng=10.1, city="TestCity", avg_response_time=45, rating=3.2)
    db.add(v1)
    db.add(v2)
    
    # Add inventory
    i1 = Inventory(vendor_id=1, resource_name="Oxygen", category="medical", quantity=50, price=100)
    i2 = Inventory(vendor_id=2, resource_name="Oxygen", category="medical", quantity=10, price=120)
    db.add(i1)
    db.add(i2)
    
    db.commit()
    yield
    db.close()
    Base.metadata.drop_all(bind=test_engine)

def test_matching_logic_ranking():
    # Login as requester (skip auth for simplicity by overriding dependency or just using ID)
    # For now, we assume matching endpoint is open or we have a token
    # Actually, we need a token because of Depends(get_current_user)
    
    # 1. Register & Login
    client.post("/auth/register", json={"name": "User", "email": "u@t.com", "password": "p", "role": "requester"})
    login_res = client.post("/auth/login", data={"username": "u@t.com", "password": "p"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Create Request
    req_res = client.post(
        "/requests/",
        headers=headers,
        json={"resource_name": "Oxygen", "category": "medical", "quantity": 5, "location_lat": 10.001, "location_lng": 10.001, "city": "TestCity", "urgency_level": "critical"}
    )
    req_id = req_res.json()["id"]
    
    # 3. Get Matches
    match_res = client.get(f"/match/{req_id}", headers=headers)
    assert match_res.status_code == 200
    vendors = match_res.json()["ranked_vendors"]
    
    assert len(vendors) >= 1
    # Fast Pharmacy should be #1 because it's closer and faster
    assert vendors[0]["shop_name"] == "Fast Pharmacy"
    assert "Ultra-proximity" in vendors[0]["explanation"]
