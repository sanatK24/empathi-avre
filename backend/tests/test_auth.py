import pytest

def test_register_user(test_client):
    response = test_client.post(
        "/auth/register",
        json={"name": "Test User", "email": "test@example.com", "password": "password123", "role": "requester"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"

def test_login_user(test_client):
    # Register first
    test_client.post(
        "/auth/register",
        json={"name": "Test User", "email": "test@example.com", "password": "password123", "role": "requester"}
    )
    # Login
    response = test_client.post(
        "/auth/login",
        data={"username": "test@example.com", "password": "password123"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_prevent_self_admin(test_client):
    response = test_client.post(
        "/auth/register",
        json={"name": "Attacker", "email": "admin@attack.com", "password": "password123", "role": "admin"}
    )
    assert response.status_code == 403
    assert "Cannot register as admin" in response.json()["error"]
