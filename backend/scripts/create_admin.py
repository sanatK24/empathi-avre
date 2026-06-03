import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import SessionLocal
from models import User, UserRole
from core.security import get_password_hash

def create_admin():
    db = SessionLocal()
    email = 'admin@empathi.com'
    password = 'admin123'
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.role = UserRole.ADMIN
            user.password_hash = get_password_hash(password)
            user.is_active = True
            db.commit()
            print(f"Successfully updated existing user {email} to ADMIN with password '{password}'")
        else:
            new_user = User(name='EmpathI Admin', email=email, password_hash=get_password_hash(password), role=UserRole.ADMIN, is_active=True, city='Mumbai')
            db.add(new_user)
            db.commit()
            print(f"Successfully created new ADMIN user {email} with password '{password}'")
    except Exception as e:
        print(f'Error creating admin: {e}')
    finally:
        db.close()
if __name__ == '__main__':
    create_admin()