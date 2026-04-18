import pytest
from fastapi.testclient import TestClient
from main import app
from database import Base, engine, get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
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
    yield
    Base.metadata.drop_all(bind=test_engine)

def test_register_user():
    response = client.post(
        "/auth/register",
        json={"name": "Test User", "email": "test@example.com", "password": "password123", "role": "requester"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"

def test_login_user():
    # Register first
    client.post(
        "/auth/register",
        json={"name": "Test User", "email": "test@example.com", "password": "password123", "role": "requester"}
    )
    # Login
    response = client.post(
        "/auth/login",
        data={"username": "test@example.com", "password": "password123"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_prevent_self_admin():
    response = client.post(
        "/auth/register",
        json={"name": "Attacker", "email": "admin@attack.com", "password": "password123", "role": "admin"}
    )
    assert response.status_code == 403
    assert "Cannot register as admin" in response.json()["error"]
