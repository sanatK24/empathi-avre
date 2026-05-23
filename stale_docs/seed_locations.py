from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User, Vendor, Request, Campaign
import random

# Coordinate centers
CITIES = {
    "Mumbai": (19.0760, 72.8777),
    "Delhi": (28.6139, 77.2090),
    "Bangalore": (12.9716, 77.5946),
    "Chennai": (13.0827, 80.2707),
    "Kolkata": (22.5726, 88.3639)
}

def get_random_coords(city):
    base_lat, base_lng = CITIES.get(city, (19.0760, 72.8777))
    # Random offset within ~10km
    offset_lat = random.uniform(-0.05, 0.05)
    offset_lng = random.uniform(-0.05, 0.05)
    return base_lat + offset_lat, base_lng + offset_lng

def seed_locations():
    engine = create_engine("sqlite:///avre.db")
    Session = sessionmaker(bind=engine)
    session = Session()

    print("Seeding locations for Users...")
    users = session.query(User).all()
    for u in users:
        if not u.lat:
            u.lat, u.lng = get_random_coords(u.city or "Mumbai")
    
    print("Seeding locations for Vendors...")
    vendors = session.query(Vendor).all()
    for v in vendors:
        v.lat, v.lng = get_random_coords(v.city or "Mumbai")
        
    print("Seeding locations for Requests...")
    requests = session.query(Request).all()
    for r in requests:
        r.location_lat, r.location_lng = get_random_coords(r.city or "Mumbai")
        
    print("Seeding locations for Campaigns...")
    campaigns = session.query(Campaign).all()
    for c in campaigns:
        c.lat, c.lng = get_random_coords(c.city or "Mumbai")
        
    session.commit()
    print("Location seeding complete!")

if __name__ == "__main__":
    seed_locations()
