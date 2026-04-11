#!/usr/bin/env python3
"""
Excel Data Schema Update Script for EmpathI
This script updates existing Excel files and creates new ones with
comprehensive data models to support the full EmpathI specification
"""

import pandas as pd
import json
import os
from datetime import datetime, timedelta
import random

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(PROJECT_ROOT, 'empathi-frontend', 'public', 'data')

os.makedirs(DATA_DIR, exist_ok=True)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def generate_sample_timestamp(days_back=0):
    """Generate a timestamp for sample data"""
    return (datetime.now() - timedelta(days=days_back)).isoformat()

def update_users_file():
    """Update users.xlsx with new fields"""
    try:
        df = pd.read_excel(os.path.join(DATA_DIR, 'users.xlsx'))
    except:
        df = pd.DataFrame({'id': [1]})

    # Ensure all new fields exist
    users_data = []
    for idx, row in df.iterrows():
        user_id = row.get('id', idx + 1)
        users_data.append({
            'id': user_id,
            'user_role': 'donor' if idx % 5 == 0 else ('ngo' if idx % 5 == 1 else 'vendor'),
            'email': f'user{user_id}@empathi.com',
            'phone': f'+91{random.randint(6000000000, 9999999999)}',
            'full_name': f'User {user_id}',
            'organization_name': f'Org {user_id}' if idx % 5 in [1, 4] else '',
            'bio': f'I am a user of EmpathI platform',
            'is_verified': idx % 5 == 1,
            'verified_at': generate_sample_timestamp() if idx % 5 == 1 else None,
            'verification_type': 'ngo_representative' if idx % 5 == 1 else None,
            'emergency_fund_opt_in': True,
            'emergency_fund_percentage': 5,
            'created_at': generate_sample_timestamp(days_back=random.randint(1, 30)),
        })

    new_df = pd.DataFrame(users_data)
    new_df.to_excel(os.path.join(DATA_DIR, 'users.xlsx'), index=False)
    print("[OK] Updated users.xlsx")

def update_posts_file():
    """Update posts.xlsx with new fields"""
    try:
        df = pd.read_excel(os.path.join(DATA_DIR, 'posts.xlsx'))
    except:
        df = pd.DataFrame({'id': [1]})

    posts_data = []
    for idx, row in df.iterrows():
        post_id = row.get('id', idx + 1)
        posts_data.append({
            'id': post_id,
            'creator_user_id': random.randint(1, 10),
            'title': row.get('title', f'Emergency {post_id}'),
            'description': row.get('content', f'Description for emergency {post_id}'),
            'description_enhanced': f'URGENT: {row.get("content", f"Emergency {post_id}")}. Immediate help needed.',
            'urgency_score': row.get('urgency_score', random.randint(40, 95)),
            'city': row.get('city', 'Mumbai'),
            'locality': row.get('locality', 'Downtown'),
            'lat': row.get('lat', 19.0760 + random.uniform(-0.1, 0.1)),
            'lng': row.get('lng', 72.8777 + random.uniform(-0.1, 0.1)),
            'status': row.get('status', 'active'),
            'is_emergency_request': idx % 3 == 0,
            'urgency_deadline': (datetime.now() + timedelta(hours=random.randint(12, 72))).isoformat() if idx % 3 == 0 else None,
            'verification_status': 'verified' if idx % 2 == 0 else 'pending',
            'verified_by': json.dumps([1, 2]) if idx % 2 == 0 else json.dumps([]),
            'is_micro_emergency': idx % 5 == 0,
            'campaign_type': 'emergency' if idx % 3 == 0 else 'fundraising',
            'resources_needed': json.dumps(['oxygen', 'medicine'] if idx % 3 == 0 else []),
            'estimate_impact': 'Can save multiple lives',
            'proof_of_resolution': None,
            'resolution_date': None,
            'impact_summary': None,
            'created_at': generate_sample_timestamp(days_back=random.randint(1, 30)),
            'updated_at': generate_sample_timestamp(days_back=random.randint(0, 5)),
        })

    new_df = pd.DataFrame(posts_data)
    new_df.to_excel(os.path.join(DATA_DIR, 'posts.xlsx'), index=False)
    print("[OK] Updated posts.xlsx")

def update_donations_file():
    """Update donations.xlsx with new fields"""
    try:
        df = pd.read_excel(os.path.join(DATA_DIR, 'donations.xlsx'))
    except:
        df = pd.DataFrame()

    donations_data = []
    for idx in range(1, 21):
        donations_data.append({
            'id': idx,
            'user_id': random.randint(1, 10),
            'post_id': random.randint(1, 10),
            'amount': random.randint(100, 5000),
            'emergency_fund_allocation': random.randint(5, 250),
            'emergency_fund_percentage': 5,
            'donor_agreed_to_emergency_fund': True,
            'status': 'completed',
            'payment_method': random.choice(['upi', 'card', 'netbanking']),
            'tax_receipt_url': None,
            'impact_update_viewed_at': None,
            'created_at': generate_sample_timestamp(days_back=random.randint(1, 30)),
        })

    df = pd.DataFrame(donations_data)
    df.to_excel(os.path.join(DATA_DIR, 'donations.xlsx'), index=False)
    print("[OK] Updated donations.xlsx")

def create_resource_availability_file():
    """Create resource_availability.xlsx"""
    data = []
    for idx in range(1, 11):
        data.append({
            'id': idx,
            'user_id': random.randint(1, 10),
            'resource_type': random.choice(['oxygen', 'medicine', 'food', 'transport', 'shelter']),
            'quantity': random.randint(5, 100),
            'unit': random.choice(['cylinders', 'tablets', 'meals', 'km', 'beds']),
            'expiry_date': (datetime.now() + timedelta(days=random.randint(7, 90))).isoformat() if random.random() > 0.5 else None,
            'available_from': generate_sample_timestamp(),
            'available_until': (datetime.now() + timedelta(days=random.randint(7, 30))).isoformat(),
            'location_lat': 19.0760 + random.uniform(-0.1, 0.1),
            'location_lng': 72.8777 + random.uniform(-0.1, 0.1),
            'pickup_only': random.choice([True, False]),
            'verified': idx % 2 == 0,
            'created_at': generate_sample_timestamp(days_back=random.randint(1, 30)),
        })

    df = pd.DataFrame(data)
    df.to_excel(os.path.join(DATA_DIR, 'resource_availability.xlsx'), index=False)
    print("[OK] Created resource_availability.xlsx")

def create_resource_requests_file():
    """Create resource_requests.xlsx"""
    data = []
    for idx in range(1, 11):
        data.append({
            'id': idx,
            'user_id': random.randint(1, 10),
            'post_id': random.randint(1, 10) if random.random() > 0.5 else None,
            'resource_type': random.choice(['oxygen', 'medicine', 'food', 'transport', 'shelter']),
            'quantity_needed': random.randint(5, 50),
            'urgency_level': random.choice(['low', 'medium', 'high', 'critical']),
            'location_lat': 19.0760 + random.uniform(-0.1, 0.1),
            'location_lng': 72.8777 + random.uniform(-0.1, 0.1),
            'reason': f'Need resources for emergency {idx}',
            'status': random.choice(['pending_match', 'matched', 'fulfilled']),
            'verified_by': random.randint(1, 5) if random.random() > 0.5 else None,
            'needed_by': (datetime.now() + timedelta(hours=random.randint(4, 72))).isoformat(),
            'created_at': generate_sample_timestamp(days_back=random.randint(1, 30)),
        })

    df = pd.DataFrame(data)
    df.to_excel(os.path.join(DATA_DIR, 'resource_requests.xlsx'), index=False)
    print("[OK] Created resource_requests.xlsx")

def create_verification_responses_file():
    """Create verification_responses.xlsx"""
    data = []
    for idx in range(1, 11):
        data.append({
            'id': idx,
            'post_id': random.randint(1, 10),
            'verifier_user_id': random.randint(1, 5),
            'verification_status': random.choice(['approved', 'rejected', 'needs_more_info']),
            'comment': f'Verification comment {idx}',
            'confidence_score': random.uniform(0.6, 1.0),
            'timestamp': generate_sample_timestamp(days_back=random.randint(0, 5)),
        })

    df = pd.DataFrame(data)
    df.to_excel(os.path.join(DATA_DIR, 'verification_responses.xlsx'), index=False)
    print("[OK] Created verification_responses.xlsx")

def create_emergency_fund_file():
    """Create emergency_fund.xlsx"""
    data = [{
        'accumulated_total': 50000.0,
        'allocated_total': 20000.0,
        'available_balance': 30000.0,
        'emergency_mode_active': False,
        'emergency_scope': None,
        'last_unlock_by': None,
        'last_unlock_at': None,
    }]

    df = pd.DataFrame(data)
    df.to_excel(os.path.join(DATA_DIR, 'emergency_fund.xlsx'), index=False)
    print("[OK] Created emergency_fund.xlsx")

def create_audit_log_file():
    """Create audit_log.xlsx"""
    data = []
    actions = ['create', 'update', 'donate', 'verify', 'allocate_fund']

    for idx in range(1, 11):
        data.append({
            'id': idx,
            'action_type': random.choice(actions),
            'entity_type': random.choice(['post', 'donation', 'resource', 'fund']),
            'entity_id': random.randint(1, 10),
            'user_id': random.randint(1, 10),
            'timestamp': generate_sample_timestamp(days_back=random.randint(0, 30)),
            'changes_json': json.dumps({'status': 'updated'}),
        })

    df = pd.DataFrame(data)
    df.to_excel(os.path.join(DATA_DIR, 'audit_log.xlsx'), index=False)
    print("[OK] Created audit_log.xlsx")

def create_notifications_file():
    """Create notifications.xlsx"""
    data = []
    notif_types = ['donation_impact', 'resource_matched', 'verification_needed', 'fund_unlocked', 'emergency_declared']

    for idx in range(1, 11):
        data.append({
            'id': idx,
            'user_id': random.randint(1, 10),
            'type': random.choice(notif_types),
            'title': f'Notification {idx}',
            'message': f'You have a new notification',
            'related_entity_type': random.choice(['post', 'resource', 'donation']),
            'related_entity_id': random.randint(1, 10),
            'is_read': random.choice([True, False]),
            'read_at': generate_sample_timestamp() if random.random() > 0.5 else None,
            'created_at': generate_sample_timestamp(days_back=random.randint(0, 30)),
        })

    df = pd.DataFrame(data)
    df.to_excel(os.path.join(DATA_DIR, 'notifications.xlsx'), index=False)
    print("[OK] Created notifications.xlsx")

def create_admin_crisis_declarations_file():
    """Create admin_crisis_declarations.xlsx"""
    data = [{
        'id': 1,
        'declared_by': 1,
        'crisis_name': 'Heavy Rainfall Event',
        'description': 'Severe flooding expected due to heavy rainfall',
        'geographic_scope': 'Mumbai',
        'emergency_fund_unlocked': True,
        'unlocked_at': generate_sample_timestamp(),
        'status': 'active',
        'created_at': generate_sample_timestamp(days_back=2),
        'resolved_at': None,
    }]

    df = pd.DataFrame(data)
    df.to_excel(os.path.join(DATA_DIR, 'admin_crisis_declarations.xlsx'), index=False)
    print("[OK] Created admin_crisis_declarations.xlsx")

# ============================================================================
# MAIN
# ============================================================================

def main():
    """Update/create all Excel files"""
    print("EmpathI Data Schema Update")
    print("=" * 50)

    try:
        update_users_file()
        update_posts_file()
        update_donations_file()
        create_resource_availability_file()
        create_resource_requests_file()
        create_verification_responses_file()
        create_emergency_fund_file()
        create_audit_log_file()
        create_notifications_file()
        create_admin_crisis_declarations_file()

        print("=" * 50)
        print("[SUCCESS] All data files updated!")
        print(f"[INFO] Data directory: {DATA_DIR}")

    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()

def update_posts_file():
    """Update posts.xlsx with new fields"""
    try:
        df = pd.read_excel(os.path.join(DATA_DIR, 'posts.xlsx'))
    except:
        df = pd.DataFrame({'id': [1]})

    posts_data = []
    for idx, row in df.iterrows():
        post_id = row.get('id', idx + 1)
        posts_data.append({
            'id': post_id,
            'creator_user_id': random.randint(1, 10),
            'title': row.get('title', f'Emergency {post_id}'),
            'description': row.get('content', f'Description for emergency {post_id}'),
            'description_enhanced': f'URGENT: {row.get("content", f"Emergency {post_id}")}. Immediate help needed.',
            'urgency_score': row.get('urgency_score', random.randint(40, 95)),
            'city': row.get('city', 'Mumbai'),
            'locality': row.get('locality', 'Downtown'),
            'lat': row.get('lat', 19.0760 + random.uniform(-0.1, 0.1)),
            'lng': row.get('lng', 72.8777 + random.uniform(-0.1, 0.1)),
            'status': row.get('status', 'active'),
            'is_emergency_request': idx % 3 == 0,
            'urgency_deadline': (datetime.now() + timedelta(hours=random.randint(12, 72))).isoformat() if idx % 3 == 0 else None,
            'verification_status': 'verified' if idx % 2 == 0 else 'pending',
            'verified_by': json.dumps([1, 2]) if idx % 2 == 0 else json.dumps([]),
            'is_micro_emergency': idx % 5 == 0,
            'campaign_type': 'emergency' if idx % 3 == 0 else 'fundraising',
            'resources_needed': json.dumps(['oxygen', 'medicine'] if idx % 3 == 0 else []),
            'estimate_impact': 'Can save multiple lives',
            'proof_of_resolution': None,
            'resolution_date': None,
            'impact_summary': None,
            'created_at': generate_sample_timestamp(days_back=random.randint(1, 30)),
            'updated_at': generate_sample_timestamp(days_back=random.randint(0, 5)),
        })

    new_df = pd.DataFrame(posts_data)
    new_df.to_excel(os.path.join(DATA_DIR, 'posts.xlsx'), index=False)
    print("✓ Updated posts.xlsx")

def update_donations_file():
    """Update donations.xlsx with new fields"""
    try:
        df = pd.read_excel(os.path.join(DATA_DIR, 'donations.xlsx'))
    except:
        df = pd.DataFrame()

    donations_data = []
    for idx in range(1, 21):
        donations_data.append({
            'id': idx,
            'user_id': random.randint(1, 10),
            'post_id': random.randint(1, 10),
            'amount': random.randint(100, 5000),
            'emergency_fund_allocation': random.randint(5, 250),
            'emergency_fund_percentage': 5,
            'donor_agreed_to_emergency_fund': True,
            'status': 'completed',
            'payment_method': random.choice(['upi', 'card', 'netbanking']),
            'tax_receipt_url': None,
            'impact_update_viewed_at': None,
            'created_at': generate_sample_timestamp(days_back=random.randint(1, 30)),
        })

    df = pd.DataFrame(donations_data)
    df.to_excel(os.path.join(DATA_DIR, 'donations.xlsx'), index=False)
    print("✓ Updated donations.xlsx")

def create_resource_availability_file():
    """Create resource_availability.xlsx"""
    data = []
    for idx in range(1, 11):
        data.append({
            'id': idx,
            'user_id': random.randint(1, 10),
            'resource_type': random.choice(['oxygen', 'medicine', 'food', 'transport', 'shelter']),
            'quantity': random.randint(5, 100),
            'unit': random.choice(['cylinders', 'tablets', 'meals', 'km', 'beds']),
            'expiry_date': (datetime.now() + timedelta(days=random.randint(7, 90))).isoformat() if random.random() > 0.5 else None,
            'available_from': generate_sample_timestamp(),
            'available_until': (datetime.now() + timedelta(days=random.randint(7, 30))).isoformat(),
            'location_lat': 19.0760 + random.uniform(-0.1, 0.1),
            'location_lng': 72.8777 + random.uniform(-0.1, 0.1),
            'pickup_only': random.choice([True, False]),
            'verified': idx % 2 == 0,
            'created_at': generate_sample_timestamp(days_back=random.randint(1, 30)),
        })

    df = pd.DataFrame(data)
    df.to_excel(os.path.join(DATA_DIR, 'resource_availability.xlsx'), index=False)
    print("✓ Created resource_availability.xlsx")

def create_resource_requests_file():
    """Create resource_requests.xlsx"""
    data = []
    for idx in range(1, 11):
        data.append({
            'id': idx,
            'user_id': random.randint(1, 10),
            'post_id': random.randint(1, 10) if random.random() > 0.5 else None,
            'resource_type': random.choice(['oxygen', 'medicine', 'food', 'transport', 'shelter']),
            'quantity_needed': random.randint(5, 50),
            'urgency_level': random.choice(['low', 'medium', 'high', 'critical']),
            'location_lat': 19.0760 + random.uniform(-0.1, 0.1),
            'location_lng': 72.8777 + random.uniform(-0.1, 0.1),
            'reason': f'Need resources for emergency {idx}',
            'status': random.choice(['pending_match', 'matched', 'fulfilled']),
            'verified_by': random.randint(1, 5) if random.random() > 0.5 else None,
            'needed_by': (datetime.now() + timedelta(hours=random.randint(4, 72))).isoformat(),
            'created_at': generate_sample_timestamp(days_back=random.randint(1, 30)),
        })

    df = pd.DataFrame(data)
    df.to_excel(os.path.join(DATA_DIR, 'resource_requests.xlsx'), index=False)
    print("✓ Created resource_requests.xlsx")

def create_verification_responses_file():
    """Create verification_responses.xlsx"""
    data = []
    for idx in range(1, 11):
        data.append({
            'id': idx,
            'post_id': random.randint(1, 10),
            'verifier_user_id': random.randint(1, 5),
            'verification_status': random.choice(['approved', 'rejected', 'needs_more_info']),
            'comment': f'Verification comment {idx}',
            'confidence_score': random.uniform(0.6, 1.0),
            'timestamp': generate_sample_timestamp(days_back=random.randint(0, 5)),
        })

    df = pd.DataFrame(data)
    df.to_excel(os.path.join(DATA_DIR, 'verification_responses.xlsx'), index=False)
    print("✓ Created verification_responses.xlsx")

def create_emergency_fund_file():
    """Create emergency_fund.xlsx"""
    data = [{
        'accumulated_total': 50000.0,
        'allocated_total': 20000.0,
        'available_balance': 30000.0,
        'emergency_mode_active': False,
        'emergency_scope': None,
        'last_unlock_by': None,
        'last_unlock_at': None,
    }]

    df = pd.DataFrame(data)
    df.to_excel(os.path.join(DATA_DIR, 'emergency_fund.xlsx'), index=False)
    print("✓ Created emergency_fund.xlsx")

def create_audit_log_file():
    """Create audit_log.xlsx"""
    data = []
    actions = ['create', 'update', 'donate', 'verify', 'allocate_fund']

    for idx in range(1, 11):
        data.append({
            'id': idx,
            'action_type': random.choice(actions),
            'entity_type': random.choice(['post', 'donation', 'resource', 'fund']),
            'entity_id': random.randint(1, 10),
            'user_id': random.randint(1, 10),
            'timestamp': generate_sample_timestamp(days_back=random.randint(0, 30)),
            'changes_json': json.dumps({'status': 'updated'}),
        })

    df = pd.DataFrame(data)
    df.to_excel(os.path.join(DATA_DIR, 'audit_log.xlsx'), index=False)
    print("✓ Created audit_log.xlsx")

def create_notifications_file():
    """Create notifications.xlsx"""
    data = []
    notif_types = ['donation_impact', 'resource_matched', 'verification_needed', 'fund_unlocked', 'emergency_declared']

    for idx in range(1, 11):
        data.append({
            'id': idx,
            'user_id': random.randint(1, 10),
            'type': random.choice(notif_types),
            'title': f'Notification {idx}',
            'message': f'You have a new notification',
            'related_entity_type': random.choice(['post', 'resource', 'donation']),
            'related_entity_id': random.randint(1, 10),
            'is_read': random.choice([True, False]),
            'read_at': generate_sample_timestamp() if random.random() > 0.5 else None,
            'created_at': generate_sample_timestamp(days_back=random.randint(0, 30)),
        })

    df = pd.DataFrame(data)
    df.to_excel(os.path.join(DATA_DIR, 'notifications.xlsx'), index=False)
    print("✓ Created notifications.xlsx")

def create_admin_crisis_declarations_file():
    """Create admin_crisis_declarations.xlsx"""
    data = [{
        'id': 1,
        'declared_by': 1,
        'crisis_name': 'Heavy Rainfall Event',
        'description': 'Severe flooding expected due to heavy rainfall',
        'geographic_scope': 'Mumbai',
        'emergency_fund_unlocked': True,
        'unlocked_at': generate_sample_timestamp(),
        'status': 'active',
        'created_at': generate_sample_timestamp(days_back=2),
        'resolved_at': None,
    }]

    df = pd.DataFrame(data)
    df.to_excel(os.path.join(DATA_DIR, 'admin_crisis_declarations.xlsx'), index=False)
    print("✓ Created admin_crisis_declarations.xlsx")

# ============================================================================
# MAIN
# ============================================================================

def main():
    """Update/create all Excel files"""
    print("EmpathI Data Schema Update")
    print("=" * 50)

    try:
        update_users_file()
        update_posts_file()
        update_donations_file()
        create_resource_availability_file()
        create_resource_requests_file()
        create_verification_responses_file()
        create_emergency_fund_file()
        create_audit_log_file()
        create_notifications_file()
        create_admin_crisis_declarations_file()

        print("=" * 50)
        print("✓ All data files updated successfully!")
        print(f"✓ Data directory: {DATA_DIR}")

    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
