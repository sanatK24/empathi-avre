import sys
import os

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(root_dir, "backend")
sys.path.append(root_dir)
sys.path.append(backend_dir)

from database import SessionLocal
from models import User, Donation, Request, Match

db = SessionLocal()
try:
    print("--- John Doe (User ID 45) Profile ---")
    john = db.query(User).filter(User.id == 45).first()
    if john:
        print(f"Name: {john.name}, Email: {john.email}, Role: {john.role}")
        
        print("\n--- John Doe's Donations ---")
        donations = db.query(Donation).filter(Donation.user_id == 45).all()
        print(f"Total count: {len(donations)}")
        print(f"Total amount: ₹{sum(d.amount for d in donations):,}")
        for d in donations:
            print(f"  Campaign: {d.campaign.title if d.campaign else 'None'}, Amount: ₹{d.amount}, Status: {d.status}")
            
        print("\n--- John Doe's Requests ---")
        requests = db.query(Request).filter(Request.user_id == 45).all()
        print(f"Total count: {len(requests)}")
        for r in requests:
            print(f"  Resource: {r.resource_name}, Status: {r.status}, Urgency: {r.urgency_level}")
            
        print("\n--- John Doe's Matches ---")
        matches = db.query(Match).join(Request).filter(Request.user_id == 45).all()
        print(f"Total count: {len(matches)}")
        for m in matches:
            print(f"  Match ID: {m.id}, Request: {m.request.resource_name}, Vendor: {m.vendor.shop_name if m.vendor else 'None'}, Status: {m.status}")
    else:
        print("John Doe not found!")
finally:
    db.close()
