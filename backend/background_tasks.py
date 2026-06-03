from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
import logging
logger = logging.getLogger(__name__)
class BackgroundTasks:
    @staticmethod
    def generate_campaign_analytics(db: Session, campaign_id: int):
        try:
            from models import Campaign, Donation, DonationStatus
            logger.info(f"Starting analytics generation for campaign {campaign_id}")
            campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
            if not campaign: logger.error(f"Campaign {campaign_id} not found"); return
            donations = db.query(Donation).filter(Donation.campaign_id == campaign_id, Donation.status == DonationStatus.COMPLETED).all()
            total_raised = sum(d.amount for d in donations); total_donors = len(set(d.user_id for d in donations))
            avg_donation = total_raised / len(donations) if donations else 0; thirty_days_ago = datetime.now() - timedelta(days=30)
            recent_donations = [d for d in donations if d.created_at >= thirty_days_ago]
            mid_point = thirty_days_ago + timedelta(days=15)
            first_half = sum(d.amount for d in donations if d.created_at < mid_point)
            growth_rate = ((total_raised - 2 * first_half) / first_half * 100) if first_half > 0 else 0
            analytics = {
                "campaign_id": campaign_id, "total_raised": total_raised, "goal_amount": campaign.goal_amount,
                "progress_percent": (total_raised / campaign.goal_amount * 100) if campaign.goal_amount > 0 else 0,
                "total_donors": total_donors, "average_donation": avg_donation, "total_donations": len(donations),
                "recent_donations_30d": len(recent_donations), "growth_rate_percent": growth_rate, "generated_at": datetime.now().isoformat()
            }
            logger.info(f"Analytics generated for campaign {campaign_id}: {analytics}")
        except Exception as e: logger.error(f"Error generating analytics for campaign {campaign_id}: {str(e)}")
    @staticmethod
    def rebuild_user_recommendations(db: Session, user_id: int):
        try:
            from models import User, Campaign, Donation, CampaignStatus; from services.campaign_service import CampaignService
            logger.info(f"Rebuilding recommendations for user {user_id}")
            user = db.query(User).filter(User.id == user_id).first()
            if not user: logger.error(f"User {user_id} not found"); return
            logger.info(f"Generated {len(CampaignService.get_recommendations(db, user, limit=20))} recommendations for user {user_id}")
        except Exception as e: logger.error(f"Error rebuilding recommendations for user {user_id}: {str(e)}")
    @staticmethod
    def generate_admin_statistics(db: Session):
        try:
            from models import User, UserRole, Campaign, CampaignStatus, Donation, DonationStatus
            logger.info("Generating admin statistics")
            stats = {
                "users": {"total": db.query(func.count(User.id)).scalar() or 0, "active": db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0},
                "campaigns": {"total": db.query(func.count(Campaign.id)).scalar() or 0, "active": db.query(func.count(Campaign.id)).filter(Campaign.status == CampaignStatus.ACTIVE).scalar() or 0, "completed": db.query(func.count(Campaign.id)).filter(Campaign.status == CampaignStatus.COMPLETED).scalar() or 0},
                "donations": {"total": db.query(func.count(Donation.id)).scalar() or 0, "completed": db.query(func.count(Donation.id)).filter(Donation.status == DonationStatus.COMPLETED).scalar() or 0, "total_raised": db.query(func.sum(Donation.amount)).filter(Donation.status == DonationStatus.COMPLETED).scalar() or 0},
                "generated_at": datetime.now().isoformat()
            }
            logger.info(f"Admin statistics generated: {stats}"); return stats
        except Exception as e: logger.error(f"Error generating admin statistics: {str(e)}")
    @staticmethod
    def process_bulk_donation_report(db: Session, campaign_id: int, user_id: int):
        try:
            from models import Campaign, Donation, DonationStatus; import csv; from io import StringIO
            logger.info(f"Generating donation report for campaign {campaign_id}")
            campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
            donations = db.query(Donation).filter(Donation.campaign_id == campaign_id, Donation.status == DonationStatus.COMPLETED).all()
            output = StringIO(); writer = csv.writer(output); writer.writerow(['Date', 'Donor', 'Amount', 'Payment Method', 'Message'])
            for donation in donations:
                writer.writerow([donation.created_at.isoformat(), "Anonymous" if donation.anonymous else donation.donor.name, f"₹{donation.amount}", donation.payment_method or 'N/A', donation.message or ''])
            report_content = output.getvalue(); logger.info(f"Donation report generated: {len(donations)} donations")
        except Exception as e: logger.error(f"Error generating donation report for campaign {campaign_id}: {str(e)}")
    @staticmethod
    def process_image_upload(image_path: str, campaign_id: int):
        try:
            from PIL import Image; import os
            logger.info(f"Processing image for campaign {campaign_id}")
            img = Image.open(image_path); img.thumbnail((1200, 800), Image.Resampling.LANCZOS)
            img.save(image_path.replace('.jpg', '_optimized.jpg'), 'JPEG', quality=85, optimize=True)
            if os.path.exists(image_path): os.remove(image_path)
            logger.info(f"Image processed and optimized for campaign {campaign_id}")
        except Exception as e: logger.error(f"Error processing image for campaign {campaign_id}: {str(e)}")
    @staticmethod
    def cleanup_expired_data(db: Session):
        try:
            from models import Campaign, CampaignStatus
            logger.info("Running data cleanup task")
            cutoff_date = datetime.now() - timedelta(days=365)
            old_campaigns = db.query(Campaign).filter(Campaign.created_at < cutoff_date, Campaign.status == CampaignStatus.COMPLETED).all()
            logger.info(f"Found {len(old_campaigns)} old campaigns for archival")
        except Exception as e: logger.error(f"Error during data cleanup: {str(e)}")
