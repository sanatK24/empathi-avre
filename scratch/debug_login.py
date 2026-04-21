import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import SessionLocal
from services.auth_service import AuthService
from core.exceptions import AuthException

def test_login():
    db = SessionLocal()
    try:
        print("Testing login for admin@empathi.com...")
        user = AuthService.authenticate(db, "admin@empathi.com", "password123")
        print(f"Authenticated user: {user.email}, Role: {user.role}")
        
        response = AuthService.create_token_response(user)
        print(f"Token response: {response}")
    except AuthException as e:
        print(f"Auth failed: {e.detail}")
    except Exception as e:
        import traceback
        print(f"System error: {e}")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_login()
