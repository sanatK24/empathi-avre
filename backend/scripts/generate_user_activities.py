#!/usr/bin/env python3
"""
Generate activities for a specific user (John Doe) to populate the smart feed with recommendations.
This script creates donations, requests, campaign interactions, and other activities.
"""

import sys
import os
from datetime import datetime, timedelta
from random import randint, choice, random
import random as rand

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine
from models import (
    User, UserRole, Donation, DonationStatus, Campaign, CampaignStatus,
    Request, RequestStatus, Match, MatchStatus, UrgencyLevel, Vendor,
    Inventory, AuditLog
)

def generate_activities():
    """Generate comprehensive activities for John Doe to enable smart feed recommendations"""
    
    db = SessionLocal()
    
    try:
        print("🎯 Generating activities for John Doe...\n")
        
        # 1. Find John Doe
        john = db.query(User).filter(User.name == "John Doe").first()
        if not john:
            print("❌ John Doe not found in database")
            return
        
        print(f"✅ Found user: {john.name} (ID: {john.id})")
        
        # 2. Get or create campaigns to donate to
        print("\n📋 Fetching/Creating campaigns...")
        campaigns = db.query(Campaign).filter(
            Campaign.status == CampaignStatus.ACTIVE
        ).limit(5).all()
        
        if len(campaigns) < 5:
            print(f"⚠️ Only {len(campaigns)} active campaigns found. Creating more...")
            
            campaign_templates = [
                {
                    "title": "Emergency Medical Aid - Cancer Treatment",
                    "description": "Support for cancer patients needing treatment",
                    "category": "Medical",
                    "goal_amount": 500000,
                },
                {
                    "title": "Education for Underprivileged Children",
                    "description": "Provide quality education to children in rural areas",
                    "category": "Education",
                    "goal_amount": 300000,
                },
                {
                    "title": "Disaster Relief - Flood Victims",
                    "description": "Help families affected by recent floods",
                    "category": "Disaster",
                    "goal_amount": 1000000,
                },
                {
                    "title": "Community Health Clinic Setup",
                    "description": "Establish healthcare facility in underprivileged area",
                    "category": "Healthcare",
                    "goal_amount": 750000,
                },
                {
                    "title": "Provide Clean Water & Sanitation",
                    "description": "Install water purification systems in villages",
                    "category": "Infrastructure",
                    "goal_amount": 400000,
                },
            ]
            
            # Use existing vendors or admin as campaign creators
            admins = db.query(User).filter(User.role == UserRole.ADMIN).all()
            if not admins:
                print("⚠️ No admins found, using first vendor")
                admins = db.query(User).filter(User.role == UserRole.VENDOR).all()
            
            if admins:
                for template in campaign_templates:
                    if not db.query(Campaign).filter(Campaign.title == template["title"]).first():
                        campaign = Campaign(
                            title=template["title"],
                            description=template["description"],
                            category=template["category"],
                            goal_amount=template["goal_amount"],
                            raised_amount=randint(50000, 300000),
                            created_by=admins[0].id,
                            status=CampaignStatus.ACTIVE,
                            created_at=datetime.utcnow() - timedelta(days=randint(10, 60))
                        )
                        db.add(campaign)
                        campaigns.append(campaign)
                
                db.commit()
                print(f"✅ Created {len([c for c in campaigns if c.id is None or db.query(Campaign).filter(Campaign.id == c.id).first()])} new campaigns")
        
        # 3. Generate donations
        print("\n💰 Generating donations...")
        num_donations = 8
        donation_amounts = [100, 250, 500, 1000, 500, 750, 250, 500]
        
        for i, amount in enumerate(donation_amounts):
            if campaigns:
                campaign = choice(campaigns)
                
                # Check if donation already exists
                existing = db.query(Donation).filter(
                    Donation.user_id == john.id,
                    Donation.campaign_id == campaign.id,
                    Donation.amount == amount
                ).first()
                
                if not existing:
                    donation = Donation(
                        user_id=john.id,
                        campaign_id=campaign.id,
                        amount=amount,
                        status=DonationStatus.COMPLETED,
                        created_at=datetime.utcnow() - timedelta(days=randint(1, 30))
                    )
                    db.add(donation)
                    print(f"  ✅ Donation #{i+1}: ₹{amount} to '{campaign.title}'")
        
        db.commit()
        
        # 4. Generate resource requests
        print("\n🔍 Generating resource requests...")
        resource_types = [
            ("Medical Supplies", UrgencyLevel.HIGH),
            ("Food Packages", UrgencyLevel.MEDIUM),
            ("Medicines", UrgencyLevel.HIGH),
            ("Masks and PPE", UrgencyLevel.MEDIUM),
            ("Oxygen Cylinders", UrgencyLevel.CRITICAL),
            ("Hospital Beds", UrgencyLevel.HIGH),
            ("Sanitizers", UrgencyLevel.LOW),
            ("Vitamins and Supplements", UrgencyLevel.LOW),
        ]
        
        num_requests = 5
        for i in range(num_requests):
            resource_name, urgency = choice(resource_types)
            
            # Check if similar request exists
            existing = db.query(Request).filter(
                Request.user_id == john.id,
                Request.resource_name == resource_name,
                Request.status.in_([RequestStatus.PENDING, RequestStatus.MATCHED])
            ).first()
            
            if not existing:
                category = "Medical" if any(x in resource_name for x in ["Medical", "Medicines", "Oxygen", "Hospital"]) else "Food"
                request = Request(
                    user_id=john.id,
                    resource_name=resource_name,
                    category=category,
                    quantity=randint(1, 20),
                    location_lat=12.9716,
                    location_lng=77.5946,
                    city="Bengaluru",
                    urgency_level=urgency,
                    payment_mode="donation",
                    status=RequestStatus.PENDING,
                    created_at=datetime.utcnow() - timedelta(days=randint(2, 20))
                )
                db.add(request)
                print(f"  ✅ Request #{i+1}: {resource_name} ({urgency.value})")
        
        db.commit()
        
        # 5. Get requests to create matches
        requests = db.query(Request).filter(Request.user_id == john.id).all()
        vendors = db.query(Vendor).limit(5).all()
        
        print(f"\n🤝 Generating matches (requests: {len(requests)}, vendors: {len(vendors)})...")
        
        for request in requests[:3]:  # Match 3 requests
            if vendors:
                vendor = choice(vendors)
                
                # Check if match exists
                existing = db.query(Match).filter(
                    Match.request_id == request.id,
                    Match.vendor_id == vendor.id
                ).first()
                
                if not existing:
                    m_score = random() * 0.4 + 0.55
                    m_trust = random() * 0.3 + 0.68
                    m_prob = random() * 0.2 + 0.75
                    match = Match(
                        request_id=request.id,
                        vendor_id=vendor.id,
                        score=m_score,
                        ml_score=m_score,
                        rule_score=m_score,
                        lgbm_score=m_score,
                        trust_score=m_trust,
                        fulfillment_probability=m_prob,
                        risk_adjusted_score=m_score * m_trust,
                        status=choice([MatchStatus.ACCEPTED_BY_VENDOR, MatchStatus.ACCEPTED_BY_REQUESTER]),
                        created_at=datetime.utcnow() - timedelta(days=randint(1, 15))
                    )
                    db.add(match)
                    print(f"  ✅ Match created: {request.resource_name} ↔ {vendor.shop_name}")
        
        db.commit()
        
        # 6. Create user interactions (browse campaigns, view resources)
        print("\n👁️ Generating interaction audit logs...")
        interaction_count = 0
        
        for campaign in campaigns[:6]:
            action = AuditLog(
                user_id=john.id,
                action="CAMPAIGN_VIEWED",
                resource_type="Campaign",
                resource_id=campaign.id,
                details=f"Viewed campaign: {campaign.title}",
                timestamp=datetime.utcnow() - timedelta(days=randint(1, 25))
            )
            db.add(action)
            interaction_count += 1
        
        for vendor in vendors[:4]:
            action = AuditLog(
                user_id=john.id,
                action="VENDOR_VIEWED",
                resource_type="Vendor",
                resource_id=vendor.id,
                details=f"Viewed vendor: {vendor.shop_name}",
                timestamp=datetime.utcnow() - timedelta(days=randint(1, 25))
            )
            db.add(action)
            interaction_count += 1
        
        db.commit()
        print(f"  ✅ Created {interaction_count} interaction logs")
        
        # 7. Summary
        print("\n" + "="*60)
        print("📊 ACTIVITY SUMMARY FOR JOHN DOE")
        print("="*60)
        
        donation_count = db.query(Donation).filter(Donation.user_id == john.id).count()
        request_count = db.query(Request).filter(Request.user_id == john.id).count()
        match_count = db.query(Match).filter(
            Match.request_id.in_(
                db.query(Request.id).filter(Request.user_id == john.id)
            )
        ).count()
        total_donated = sum([d.amount for d in db.query(Donation).filter(Donation.user_id == john.id).all()])
        
        print(f"✅ Total Donations: {donation_count}")
        print(f"💰 Total Amount Donated: ₹{total_donated:,}")
        print(f"✅ Resource Requests: {request_count}")
        print(f"✅ Vendor Matches: {match_count}")
        print(f"✅ Campaign Views: {interaction_count // 2}")
        print(f"✅ Vendor Views: {interaction_count // 2}")
        print("\n🎉 Activities generated successfully!")
        print("   The smart feed should now show recommendations for John Doe")
        print("="*60)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    generate_activities()

