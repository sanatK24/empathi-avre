import os
import sys
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
from models import User, Campaign, UserRole, UrgencyLevel, CampaignStatus
from core.security import get_password_hash

# Add the current directory to sys.path so we can import backend modules
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), "backend"))

def seed():
    """Seed database with 10 requester users and 1 campaign per user"""

    db = SessionLocal()

    try:
        # Campaign data: title, description, category, city, goal_amount, urgency_level
        campaigns_data = [
            {
                "title": "Emergency Relief for Flood Victims",
                "description": "Help us provide emergency supplies and medical aid to families affected by recent floods in Navi Mumbai. We are raising funds for food, water, blankets, and first aid kits. Every donation saves lives.",
                "category": "disaster_relief",
                "city": "Navi Mumbai",
                "goal_amount": 100000,
                "urgency_level": UrgencyLevel.CRITICAL,
                "lat": 19.0760,
                "lng": 72.8777
            },
            {
                "title": "Medical Camp for Underprivileged Children",
                "description": "Organize a comprehensive medical camp to provide free health checkups, vaccinations, and nutritional supplements for 500+ children in slum areas. Your contribution helps ensure a healthy future for our kids.",
                "category": "healthcare",
                "city": "Navi Mumbai",
                "goal_amount": 75000,
                "urgency_level": UrgencyLevel.HIGH,
                "lat": 19.0178,
                "lng": 73.0397
            },
            {
                "title": "Clean Water Initiative",
                "description": "Install water purification systems in 5 villages lacking access to clean water. This campaign aims to provide safe drinking water to 2000+ families and prevent waterborne diseases.",
                "category": "water_sanitation",
                "city": "Navi Mumbai",
                "goal_amount": 150000,
                "urgency_level": UrgencyLevel.HIGH,
                "lat": 19.0213,
                "lng": 73.0783
            },
            {
                "title": "Education Support for Rural Students",
                "description": "Provide scholarships, books, and learning materials to 100 deserving students from rural areas. Help us build a brighter future through quality education and mentorship programs.",
                "category": "education",
                "city": "Navi Mumbai",
                "goal_amount": 80000,
                "urgency_level": UrgencyLevel.MEDIUM,
                "lat": 19.0330,
                "lng": 73.0176
            },
            {
                "title": "COVID-19 Vaccination Drive",
                "description": "Support our vaccination drive to reach 1000+ people in underserved communities. Help us combat the pandemic by ensuring every individual has access to vaccines and medical counseling.",
                "category": "healthcare",
                "city": "Navi Mumbai",
                "goal_amount": 120000,
                "urgency_level": UrgencyLevel.CRITICAL,
                "lat": 19.0171,
                "lng": 73.0186
            },
            {
                "title": "Senior Citizen Care Home",
                "description": "Build a caring facility for abandoned elderly people. Your support will provide food, shelter, medical care, and emotional support to 50+ senior citizens who need help the most.",
                "category": "elderly_care",
                "city": "Navi Mumbai",
                "goal_amount": 200000,
                "urgency_level": UrgencyLevel.MEDIUM,
                "lat": 19.0988,
                "lng": 73.0076
            },
            {
                "title": "Mental Health Awareness Campaign",
                "description": "Launch a comprehensive mental health awareness program with counseling services, support groups, and educational workshops. Help us destigmatize mental health issues in our community.",
                "category": "mental_health",
                "city": "Navi Mumbai",
                "goal_amount": 60000,
                "urgency_level": UrgencyLevel.MEDIUM,
                "lat": 19.1579,
                "lng": 72.9935
            },
            {
                "title": "Street Children Rehabilitation Program",
                "description": "Provide shelter, education, and rehabilitation services to 200 street children. Give them a second chance at life through skill training and family reunification efforts.",
                "category": "social_welfare",
                "city": "Navi Mumbai",
                "goal_amount": 180000,
                "urgency_level": UrgencyLevel.HIGH,
                "lat": 18.9894,
                "lng": 73.1175
            },
            {
                "title": "Environmental Conservation Initiative",
                "description": "Plant 10,000 trees and restore green spaces in Navi Mumbai. Support our mission to combat climate change, improve air quality, and create a sustainable environment for future generations.",
                "category": "environment",
                "city": "Navi Mumbai",
                "goal_amount": 70000,
                "urgency_level": UrgencyLevel.MEDIUM,
                "lat": 19.0645,
                "lng": 73.0097
            },
            {
                "title": "Women Empowerment and Skill Training",
                "description": "Empower 300 women with vocational training in tailoring, cooking, and digital skills. Help them become financially independent and contribute to their family and society.",
                "category": "women_empowerment",
                "city": "Navi Mumbai",
                "goal_amount": 95000,
                "urgency_level": UrgencyLevel.MEDIUM,
                "lat": 19.1254,
                "lng": 73.0125
            }
        ]

        # Campaign cover images - mix of URLs and base64 data URIs
        campaign_images = [
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT7lNqGG9gO3ME2IkIfOnimUseI6nTX5OQn0kXssEwek4vH7p1z99-_hn2W&s",
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS5ff5yLzXQi45_5K55DWkYWQSg9tQgIoE-sOj59EjdBBsHGD3m9glKCsdE&s",
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRoGSejQNQn4aZ6Di_K8GXGwI6M0mmo4JkkTdPYTvqKkvBCI5oMD3H43zkV&s",
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRQJgYd_R1F7RCP3I5tid_YSbzwbrnVX2l2PtCaE7v_A4Umm0o-U3GQIfaw&s",
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTCg3-Mne9xDGhs5-ZBOph-HGfqM6JPiLbeaBDeXaioL5N9FsUdEsw9WaY2&s",
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT7lNqGG9gO3ME2IkIfOnimUseI6nTX5OQn0kXssEwek4vH7p1z99-_hn2W&s",
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS5ff5yLzXQi45_5K55DWkYWQSg9tQgIoE-sOj59EjdBBsHGD3m9glKCsdE&s",
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRoGSejQNQn4aZ6Di_K8GXGwI6M0mmo4JkkTdPYTvqKkvBCI5oMD3H43zkV&s",
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRQJgYd_R1F7RCP3I5tid_YSbzwbrnVX2l2PtCaE7v_A4Umm0o-U3GQIfaw&s",
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTCg3-Mne9xDGhs5-ZBOph-HGfqM6JPiLbeaBDeXaioL5N9FsUdEsw9WaY2&s"
        ]

        requester_names = [
            "Sarah Johnson",
            "Michael Chen",
            "Priya Sharma",
            "Ahmad Hassan",
            "Emma Thompson",
            "Raj Patel",
            "Maria Garcia",
            "Deepak Kumar",
            "Ananya Desai",
            "James Wilson"
        ]

        # Create 10 requester users with campaigns
        for i in range(10):
            email = f"requester{i+1}@empathi.com"
            user_name = requester_names[i]

            # Check if user already exists
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(
                    email=email,
                    name=user_name,
                    password_hash=get_password_hash("requester_pass"),
                    role=UserRole.REQUESTER,
                    is_active=True,
                    city="Navi Mumbai",
                    lat=campaigns_data[i]["lat"],
                    lng=campaigns_data[i]["lng"]
                )
                db.add(user)
                db.flush()

            # Create campaign for this user
            campaign_info = campaigns_data[i]
            deadline = datetime.now() + timedelta(days=90)

            campaign = Campaign(
                created_by=user.id,
                title=campaign_info["title"],
                description=campaign_info["description"],
                category=campaign_info["category"],
                city=campaign_info["city"],
                lat=campaign_info["lat"],
                lng=campaign_info["lng"],
                goal_amount=campaign_info["goal_amount"],
                raised_amount=0.0,
                urgency_level=campaign_info["urgency_level"],
                cover_image=campaign_images[i],
                status=CampaignStatus.ACTIVE,
                verified=True,
                deadline=deadline,
                is_flagged=False
            )
            db.add(campaign)

        db.commit()
        print("✅ Successfully seeded 10 requester users with 1 campaign each!")
        print("   - Created users: requester1@empathi.com through requester10@empathi.com")
        print("   - Each user has 1 active campaign with cover images")
        print("   - Campaigns cover various categories: healthcare, education, social welfare, etc.")

    except Exception as e:
        db.rollback()
        print(f"❌ Error during seeding: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
