import sys
import os
from sqlalchemy.orm import Session

# Add current directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import SessionLocal, engine, Base
from models import EmergencyContact, PublicFacility

def seed_emergency_data():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. National Helplines
        helplines = [
            {"name": "National Emergency Number", "phone": "112", "category": "All-in-One", "description": "Unified Emergency Response", "is_pinned": True},
            {"name": "Police", "phone": "100", "category": "Security", "description": "Emergency Police Assistance", "is_pinned": True},
            {"name": "Ambulance", "phone": "102", "category": "Medical", "description": "National Ambulance Service", "is_pinned": True},
            {"name": "Fire Brigade", "phone": "101", "category": "Fire", "description": "Emergency Fire Response", "is_pinned": True},
            {"name": "Women Helpline", "phone": "1091", "category": "Safety", "description": "Domestic Violence / Harassment help"},
            {"name": "Child Helpline", "phone": "1098", "category": "Safety", "description": "Child Abuse / Protection help"},
            {"name": "Blood Bank (Red Cross)", "phone": "011-23359379", "category": "Medical", "description": "National Blood Service Information"},
            {"name": "Disaster Management", "phone": "108", "category": "Disaster", "description": "National Disaster Response"},
            {"name": "Anti-Poison Helpline", "phone": "1800-116-117", "category": "Medical", "description": "AIIMS Poison Control Center"},
            {"name": "Health Helpline", "phone": "104", "category": "Medical", "description": "Non-emergency Health Advice"},
            {"name": "Elders Helpline", "phone": "14567", "category": "Safety", "description": "Senior Citizen Assistance"},
        ]

        # 2. City Specific - Mumbai
        mumbai_contacts = [
            {"name": "BMC Disaster Mgmt", "phone": "1916", "category": "Disaster", "city": "Mumbai", "description": "Mumbai City Disaster Control"},
            {"name": "Traffic Police Mumbai", "phone": "022-24937755", "category": "Security", "city": "Mumbai", "description": "Traffic Help & Records"},
        ]

        # 3. Public Facilities - Hospitals (Mumbai focus for demo)
        hospitals = [
            {
                "name": "Lilavati Hospital & Research Centre", 
                "facility_type": "Hospital", 
                "address": "Bandra West, Mumbai", 
                "city": "Mumbai", 
                "phone": "022-26751000", 
                "lat": 19.0515, 
                "lng": 72.8282
            },
            {
                "name": "Nanavati Max Super Speciality Hospital", 
                "facility_type": "Hospital", 
                "address": "Vile Parle West, Mumbai", 
                "city": "Mumbai", 
                "phone": "022-26267500", 
                "lat": 19.1027, 
                "lng": 72.8369
            },
            {
                "name": "SevenHills Hospital", 
                "facility_type": "Hospital", 
                "address": "Andheri East, Mumbai", 
                "city": "Mumbai", 
                "phone": "022-67676767", 
                "lat": 19.1171, 
                "lng": 72.8767
            },
            {
                "name": "Tata Memorial Hospital", 
                "facility_type": "Trauma Center", 
                "address": "Parel, Mumbai", 
                "city": "Mumbai", 
                "phone": "022-24177000", 
                "lat": 19.0044, 
                "lng": 72.8427
            },
            {
                "name": "Breach Candy Hospital", 
                "facility_type": "Hospital", 
                "address": "Bhulabhai Desai Road, Mumbai", 
                "city": "Mumbai", 
                "phone": "022-23667788", 
                "lat": 18.9721, 
                "lng": 72.8048
            },
            {
                "name": "Red Cross Blood Bank", 
                "facility_type": "Blood Bank", 
                "address": "Fort, Mumbai", 
                "city": "Mumbai", 
                "phone": "022-22663527", 
                "lat": 18.9322, 
                "lng": 72.8354
            },
        ]

        # Clear existing to prevent duplicates
        db.query(EmergencyContact).delete()
        db.query(PublicFacility).delete()

        # Add all
        for h in helplines + mumbai_contacts:
            db.add(EmergencyContact(**h))
        
        for f in hospitals:
            db.add(PublicFacility(**f))

        db.commit()
        print(f"Successfully seeded {len(helplines) + len(mumbai_contacts)} helplines and {len(hospitals)} facilities.")
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_emergency_data()
