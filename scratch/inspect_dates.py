import sys
import os

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(root_dir, "backend")
sys.path.append(root_dir)
sys.path.append(backend_dir)

from database import SessionLocal
from models import Donation

db = SessionLocal()
try:
    donations = db.query(Donation).filter(Donation.user_id == 45).order_by(Donation.created_at.desc()).all()
    for d in donations:
        print(f"ID: {d.id}, Amount: {d.amount}, Date: {d.created_at}")
finally:
    db.close()
