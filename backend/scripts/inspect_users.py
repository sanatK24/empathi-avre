import os
import sys

# Append backend directory to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import SessionLocal
from models import User

def inspect_users():
    session = SessionLocal()
    try:
        users = session.query(User).order_by(User.id.desc()).all()
        print(f"Total users in database: {len(users)}")
        
        test_users = []
        real_users = []
        
        for u in users:
            is_test = False
            # Check criteria for test users
            email_lower = u.email.lower() if u.email else ""
            name_lower = u.name.lower() if u.name else ""
            
            if (
                email_lower.startswith("test") or
                email_lower.endswith("@test.com") or
                email_lower == "user@empathi.com" or
                name_lower.startswith("test") or
                u.name == "X"
            ):
                is_test = True
                
            if is_test:
                test_users.append(u)
            else:
                real_users.append(u)
                
        print(f"\nReal Users ({len(real_users)}):")
        for u in real_users:
            print(f"ID: {u.id} | Name: {u.name} | Email: {u.email} | Role: {u.role}")
            
        print(f"\nTest Users to delete ({len(test_users)}):")
        for u in test_users[:15]: # Show first 15 as preview
            print(f"ID: {u.id} | Name: {u.name} | Email: {u.email} | Role: {u.role}")
        if len(test_users) > 15:
            print(f"... and {len(test_users) - 15} more test users.")
            
    finally:
        session.close()

if __name__ == '__main__':
    inspect_users()
