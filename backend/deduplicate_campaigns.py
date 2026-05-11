from database import SessionLocal
from models import Campaign, Donation, CampaignUpdate
import sys

db = SessionLocal()

try:
    # Get all campaigns
    campaigns = db.query(Campaign).all()

    # Track which campaigns to delete (keep first, delete rest)
    seen_creators = {}
    to_delete = []
    to_keep = []

    for campaign in campaigns:
        creator_id = campaign.created_by

        if creator_id not in seen_creators:
            seen_creators[creator_id] = campaign.id
            to_keep.append(campaign.id)
            print(f"✓ Keeping: Campaign {campaign.id} - '{campaign.title}' by {campaign.creator.name}")
        else:
            to_delete.append(campaign.id)
            print(f"✗ Deleting: Campaign {campaign.id} - '{campaign.title}' by {campaign.creator.name} (duplicate)")

    print(f"\n📊 Summary:")
    print(f"  Total campaigns: {len(campaigns)}")
    print(f"  Keeping: {len(to_keep)}")
    print(f"  Deleting: {len(to_delete)}")

    # Delete duplicates
    if to_delete:
        print(f"\n🗑️  Deleting {len(to_delete)} duplicate campaigns...")

        # First, delete related donations and updates
        for campaign_id in to_delete:
            # Delete donations first (no foreign key constraint needed after)
            donations = db.query(Donation).filter(Donation.campaign_id == campaign_id).all()
            for donation in donations:
                db.delete(donation)

            # Delete campaign updates
            updates = db.query(CampaignUpdate).filter(CampaignUpdate.campaign_id == campaign_id).all()
            for update in updates:
                db.delete(update)

            # Delete the campaign itself
            campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
            if campaign:
                db.delete(campaign)

        db.commit()
        print(f"✅ Successfully deleted {len(to_delete)} duplicate campaigns!")
    else:
        print("\n✅ No duplicates found!")

    # Verify
    final_count = db.query(Campaign).count()
    print(f"\n📈 Final campaign count: {final_count}")

except Exception as e:
    db.rollback()
    print(f"❌ Error during deduplication: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
