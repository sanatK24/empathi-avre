import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, CampaignCategory, CampaignSubcategory, AiValidationRule
from database import engine

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

TAXONOMY_DATA = [
    {
        "name": "Medical",
        "verification_level": "HIGH",
        "is_active": True,
        "subcategories": [
            "Surgery", "Cancer Treatment", "ICU/Emergency Care", "Organ Transplant", 
            "Chronic Illness", "Mental Health Support", "Disability Support", "Rehabilitation", 
            "Pediatric Treatment", "Rare Disease Treatment", "Medication Support", "Hospital Bills", "Therapy & Recovery"
        ],
        "ai_rules": [
            {"capability": "OCR", "description": "OCR extraction"},
            {"capability": "Classification", "description": "medical keyword classification"},
            {"capability": "Validation", "description": "document verification"},
            {"capability": "Similarity", "description": "duplicate case detection"},
            {"capability": "NLP", "description": "trust scoring"}
        ]
    },
    {
        "name": "Emergency",
        "verification_level": "MEDIUM-HIGH",
        "is_active": True,
        "subcategories": [
            "Accident Recovery", "House Fire", "Sudden Financial Crisis", "Theft Recovery", 
            "Domestic Violence Support", "Temporary Shelter", "Evacuation Assistance", "Emergency Travel", "Crisis Relocation"
        ],
        "ai_rules": [
            {"capability": "NLP", "description": "urgency scoring"},
            {"capability": "NLP", "description": "emotional manipulation detection"},
            {"capability": "Similarity", "description": "duplicate incident detection"}
        ]
    },
    {
        "name": "Education",
        "verification_level": "MEDIUM",
        "is_active": True,
        "subcategories": [
            "School Fees", "College Tuition", "Study Abroad", "Student Loans", "Scholarships", 
            "Educational Supplies", "Skill Development", "Online Courses", "Research Projects", "Competitive Exams"
        ],
        "ai_rules": [
            {"capability": "OCR", "description": "admission letter OCR"},
            {"capability": "Classification", "description": "education-category classification"},
            {"capability": "NLP", "description": "readability optimization"}
        ]
    },
    {
        "name": "Memorial & Funeral",
        "verification_level": "MEDIUM",
        "is_active": True,
        "subcategories": [
            "Funeral Expenses", "Memorial Services", "Family Support After Loss", 
            "Burial Costs", "Religious Ceremonies", "Tribute Funds"
        ],
        "ai_rules": [
            {"capability": "Similarity", "description": "duplicate obituary detection"},
            {"capability": "NLP", "description": "sensitive-content moderation"}
        ]
    },
    {
        "name": "Nonprofit & Charity",
        "verification_level": "HIGH",
        "is_active": True,
        "subcategories": [
            "NGO Operations", "Community Welfare", "Food Drives", "Shelter Programs", 
            "Rural Development", "Child Welfare", "Women Empowerment", "Healthcare Outreach", "Educational Outreach", "Elderly Support"
        ],
        "ai_rules": [
            {"capability": "Validation", "description": "NGO verification"},
            {"capability": "Summarization", "description": "impact summarization"},
            {"capability": "NLP", "description": "campaign trust analysis"}
        ]
    },
    {
        "name": "Community Support",
        "verification_level": "MEDIUM",
        "is_active": True,
        "subcategories": [
            "Neighborhood Rebuilding", "Community Kitchens", "Public Infrastructure", 
            "Local Welfare", "Social Initiatives", "Volunteer Drives", "Shared Resource Pools", "Civic Campaigns"
        ],
        "ai_rules": [
            {"capability": "Estimation", "description": "impact estimation"},
            {"capability": "Similarity", "description": "duplicate locality detection"}
        ]
    },
    {
        "name": "Disaster Relief",
        "verification_level": "HIGH",
        "is_active": True,
        "subcategories": [
            "Flood Relief", "Earthquake Relief", "Cyclone Relief", "Wildfire Relief", 
            "Pandemic Assistance", "Refugee Support", "Food Distribution", "Emergency Shelters", "Water & Sanitation"
        ],
        "ai_rules": [
            {"capability": "Geo", "description": "geo-consistency analysis"},
            {"capability": "Similarity", "description": "duplicate disaster campaign detection"},
            {"capability": "NLP", "description": "urgency prioritization"}
        ]
    },
    {
        "name": "Family Support",
        "verification_level": "MEDIUM",
        "is_active": True,
        "subcategories": [
            "Single Parent Support", "Childcare Assistance", "Family Medical Support", 
            "Elder Care", "Financial Hardship", "Housing Assistance", "Family Crisis Recovery"
        ],
        "ai_rules": [
            {"capability": "NLP", "description": "trust heuristics"},
            {"capability": "NLP", "description": "readability optimization"}
        ]
    },
    {
        "name": "Animal & Pet Care",
        "verification_level": "MEDIUM",
        "is_active": True,
        "subcategories": [
            "Pet Surgery", "Animal Rescue", "Shelter Funding", "Wildlife Rehabilitation", 
            "Adoption Support", "Veterinary Bills", "Rescue Transport"
        ],
        "ai_rules": [
            {"capability": "Vision", "description": "image-text consistency"},
            {"capability": "Similarity", "description": "duplicate rescue detection"}
        ]
    },
    {
        "name": "Sports",
        "verification_level": "LOW-MEDIUM",
        "is_active": True,
        "subcategories": ["Athlete Sponsorship", "Tournament Travel", "Equipment Funding", "Team Support", "Youth Sports"],
        "ai_rules": []
    },
    {
        "name": "Creative Projects",
        "verification_level": "LOW",
        "is_active": True,
        "subcategories": ["Independent Films", "Music Production", "Art Exhibitions", "Photography", "Writing & Publishing", "Indie Games", "Theatre & Performance"],
        "ai_rules": []
    },
    {
        "name": "Volunteer Work",
        "verification_level": "MEDIUM",
        "is_active": True,
        "subcategories": ["Mission Trips", "Local Volunteer Campaigns", "Relief Volunteers", "Medical Camps", "Educational Camps"],
        "ai_rules": []
    },
    {
        "name": "Faith & Religious",
        "verification_level": "LOW-MEDIUM",
        "is_active": True,
        "subcategories": ["Religious Events", "Pilgrimage Support", "Worship Infrastructure", "Charity Missions", "Community Gatherings"],
        "ai_rules": []
    },
    {
        "name": "Environmental",
        "verification_level": "MEDIUM",
        "is_active": True,
        "subcategories": ["Tree Plantation", "Water Conservation", "Wildlife Protection", "Cleanup Drives", "Sustainable Projects", "Climate Initiatives"],
        "ai_rules": []
    },
    {
        "name": "Small Business Support",
        "verification_level": "MEDIUM",
        "is_active": True,
        "subcategories": ["Startup Recovery", "Local Shops", "Women Entrepreneurs", "Rural Businesses", "Equipment Funding"],
        "ai_rules": []
    },
    {
        "name": "Travel",
        "verification_level": "LOW",
        "is_active": False,
        "subcategories": ["Medical Travel", "Emergency Travel", "Student Relocation", "Refugee Relocation"],
        "ai_rules": []
    },
    {
        "name": "Weddings & Wishes",
        "verification_level": "LOW",
        "is_active": False,
        "subcategories": ["Wedding Support", "Honeymoon Assistance", "Dream Fulfillment", "Personal Celebrations"],
        "ai_rules": []
    }
]

def seed_db():
    print("Recreating database schema (dropping existing tables)...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    print("Seeding Campaign Taxonomy...")

    for cat_data in TAXONOMY_DATA:
        category = CampaignCategory(
            name=cat_data["name"],
            verification_level=cat_data["verification_level"],
            is_active=cat_data["is_active"]
        )
        db.add(category)
        db.flush() # get category.id
        
        for sub_name in cat_data["subcategories"]:
            sub = CampaignSubcategory(
                category_id=category.id,
                name=sub_name
            )
            db.add(sub)
            
        for rule_data in cat_data["ai_rules"]:
            rule = AiValidationRule(
                category_id=category.id,
                capability=rule_data["capability"],
                description=rule_data["description"]
            )
            db.add(rule)
            
    db.commit()
    print("Taxonomy seeding complete!")
    
    # We should also recreate a dummy user so we can still login
    from core.security import get_password_hash
    from models import UserRole, User
    
    admin_user = User(
        name="Sanat Karkhanis",
        email="sanat.karkhanis2@gmail.com",
        password_hash=get_password_hash("password123"),
        role=UserRole.ADMIN,
        city="Mumbai",
        is_active=True
    )
    db.add(admin_user)
    
    user1 = User(
        name="Test User",
        email="user@empathi.com",
        password_hash=get_password_hash("password123"),
        role=UserRole.USER,
        city="Mumbai",
        is_active=True
    )
    db.add(user1)
    
    db.commit()
    print("Users seeded!")
    db.close()

if __name__ == "__main__":
    seed_db()
