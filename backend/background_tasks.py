"""
Background Tasks Module for EmpathI

Handles long-running operations without blocking the API response:
- Campaign analytics report generation
- User recommendations rebuilding
- Bulk donation statistics
- Admin system statistics
- Image processing
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
import logging

logger = logging.getLogger(__name__)

class BackgroundTasks:
    """Collection of background task functions for EmpathI"""

    @staticmethod
    def generate_campaign_analytics(db: Session, campaign_id: int):
        """
        Generate detailed analytics report for a campaign.
        This is expensive: aggregates donors, calculates trends, etc.

        Args:
            db: Database session
            campaign_id: Campaign ID to analyze
        """
        try:
            from models import Campaign, Donation, DonationStatus
            from datetime import datetime

            logger.info(f"Starting analytics generation for campaign {campaign_id}")

            campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
            if not campaign:
                logger.error(f"Campaign {campaign_id} not found")
                return

            # Get all donations
            donations = db.query(Donation).filter(
                Donation.campaign_id == campaign_id,
                Donation.status == DonationStatus.COMPLETED
            ).all()

            # Calculate stats
            total_raised = sum(d.amount for d in donations)
            total_donors = len(set(d.user_id for d in donations))
            avg_donation = total_raised / len(donations) if donations else 0

            # Calculate daily stats (last 30 days)
            thirty_days_ago = datetime.now() - timedelta(days=30)
            recent_donations = [d for d in donations if d.created_at >= thirty_days_ago]

            # Calculate growth trend
            mid_point = thirty_days_ago + timedelta(days=15)
            first_half = sum(d.amount for d in donations if d.created_at < mid_point)
            second_half = total_raised - first_half
            growth_rate = ((second_half - first_half) / first_half * 100) if first_half > 0 else 0

            analytics = {
                "campaign_id": campaign_id,
                "total_raised": total_raised,
                "goal_amount": campaign.goal_amount,
                "progress_percent": (total_raised / campaign.goal_amount * 100) if campaign.goal_amount > 0 else 0,
                "total_donors": total_donors,
                "average_donation": avg_donation,
                "total_donations": len(donations),
                "recent_donations_30d": len(recent_donations),
                "growth_rate_percent": growth_rate,
                "generated_at": datetime.now().isoformat()
            }

            # Store in cache or database (optional)
            logger.info(f"Analytics generated for campaign {campaign_id}: {analytics}")

        except Exception as e:
            logger.error(f"Error generating analytics for campaign {campaign_id}: {str(e)}")

    @staticmethod
    def rebuild_user_recommendations(db: Session, user_id: int):
        """
        Rebuild personalized recommendations for a user.
        This involves ML feature engineering and scoring.

        Args:
            db: Database session
            user_id: User ID to generate recommendations for
        """
        try:
            from models import User, Campaign, Donation, CampaignStatus
            from services.campaign_service import CampaignService

            logger.info(f"Rebuilding recommendations for user {user_id}")

            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                logger.error(f"User {user_id} not found")
                return

            # Get personalized recommendations
            recommendations = CampaignService.get_recommendations(db, user, limit=20)

            logger.info(f"Generated {len(recommendations)} recommendations for user {user_id}")
            # Could store these in cache for faster retrieval later

        except Exception as e:
            logger.error(f"Error rebuilding recommendations for user {user_id}: {str(e)}")

    @staticmethod
    def generate_admin_statistics(db: Session):
        """
        Generate comprehensive admin dashboard statistics.
        This aggregates data from multiple tables.

        Args:
            db: Database session
        """
        try:
            from models import User, UserRole, Campaign, CampaignStatus, Request, Vendor, Donation, DonationStatus

            logger.info("Generating admin statistics")

            stats = {
                "users": {
                    "total": db.query(func.count(User.id)).scalar() or 0,
                    "requesters": db.query(func.count(User.id)).filter(User.role == UserRole.REQUESTER).scalar() or 0,
                    "vendors": db.query(func.count(User.id)).filter(User.role == UserRole.VENDOR).scalar() or 0,
                    "active": db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
                },
                "campaigns": {
                    "total": db.query(func.count(Campaign.id)).scalar() or 0,
                    "active": db.query(func.count(Campaign.id)).filter(Campaign.status == CampaignStatus.ACTIVE).scalar() or 0,
                    "completed": db.query(func.count(Campaign.id)).filter(Campaign.status == CampaignStatus.COMPLETED).scalar() or 0,
                },
                "requests": {
                    "total": db.query(func.count(Request.id)).scalar() or 0,
                },
                "donations": {
                    "total": db.query(func.count(Donation.id)).scalar() or 0,
                    "completed": db.query(func.count(Donation.id)).filter(Donation.status == DonationStatus.COMPLETED).scalar() or 0,
                    "total_raised": db.query(func.sum(Donation.amount)).filter(Donation.status == DonationStatus.COMPLETED).scalar() or 0
                },
                "vendors": {
                    "total": db.query(func.count(Vendor.id)).scalar() or 0,
                    "verified": db.query(func.count(Vendor.id)).filter(Vendor.verification_status == "VERIFIED").scalar() or 0
                },
                "generated_at": datetime.now().isoformat()
            }

            logger.info(f"Admin statistics generated: {stats}")
            return stats

        except Exception as e:
            logger.error(f"Error generating admin statistics: {str(e)}")

    @staticmethod
    def process_bulk_donation_report(db: Session, campaign_id: int, requester_id: int):
        """
        Generate and prepare a detailed donation report for export.
        Heavy CSV generation and data aggregation.

        Args:
            db: Database session
            campaign_id: Campaign ID
            requester_id: User requesting the report
        """
        try:
            from models import Campaign, Donation, DonationStatus
            import csv
            from io import StringIO

            logger.info(f"Generating donation report for campaign {campaign_id}")

            campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
            donations = db.query(Donation).filter(
                Donation.campaign_id == campaign_id,
                Donation.status == DonationStatus.COMPLETED
            ).all()

            # Generate CSV in memory
            output = StringIO()
            writer = csv.writer(output)

            # Headers
            writer.writerow(['Date', 'Donor', 'Amount', 'Payment Method', 'Message'])

            # Data rows
            for donation in donations:
                donor_name = "Anonymous" if donation.anonymous else donation.donor.name
                writer.writerow([
                    donation.created_at.isoformat(),
                    donor_name,
                    f"₹{donation.amount}",
                    donation.payment_method or 'N/A',
                    donation.message or ''
                ])

            report_content = output.getvalue()
            logger.info(f"Donation report generated: {len(donations)} donations")

            # Could save to file storage or send email

        except Exception as e:
            logger.error(f"Error generating donation report for campaign {campaign_id}: {str(e)}")

    @staticmethod
    def process_image_upload(image_path: str, campaign_id: int):
        """
        Process uploaded campaign cover image.
        Heavy I/O: resizing, optimization, format conversion.

        Args:
            image_path: Path to uploaded image
            campaign_id: Campaign ID
        """
        try:
            from PIL import Image
            import os

            logger.info(f"Processing image for campaign {campaign_id}")

            # Open image
            img = Image.open(image_path)

            # Resize to optimal dimensions
            # thumbnail preserves aspect ratio
            img.thumbnail((1200, 800), Image.Resampling.LANCZOS)

            # Optimize file size
            optimized_path = image_path.replace('.jpg', '_optimized.jpg')
            img.save(optimized_path, 'JPEG', quality=85, optimize=True)

            # Clean up original
            if os.path.exists(image_path):
                os.remove(image_path)

            logger.info(f"Image processed and optimized for campaign {campaign_id}")

        except Exception as e:
            logger.error(f"Error processing image for campaign {campaign_id}: {str(e)}")

    @staticmethod
    def rebuild_avre_rankings(db: Session):
        """
        Rebuild AVRE ranking scores for all active requests.
        ML feature engineering and batch scoring.

        Args:
            db: Database session
        """
        try:
            from models import Request, RequestStatus, Match
            from services.empathi_engine import EmpathiEngine

            logger.info("Rebuilding AVRE rankings for all active requests")

            # Get all active requests
            active_requests = db.query(Request).filter(
                Request.status.in_([RequestStatus.PENDING, RequestStatus.MATCHED])
            ).all()

            for request in active_requests:
                # Run AVRE on each request
                try:
                    matches = EmpathiEngine.match_request(db, request)
                    logger.info(f"Rebuilt matches for request {request.id}: {len(matches)} matches")
                except Exception as e:
                    logger.error(f"Error rebuilding matches for request {request.id}: {str(e)}")

            logger.info(f"AVRE rankings rebuilt for {len(active_requests)} requests")

        except Exception as e:
            logger.error(f"Error rebuilding AVRE rankings: {str(e)}")

    @staticmethod
    def cleanup_expired_data(db: Session):
        """
        Periodic cleanup task: delete expired sessions, old logs, etc.

        Args:
            db: Database session
        """
        try:
            from models import Campaign, CampaignStatus
            from datetime import datetime

            logger.info("Running data cleanup task")

            # Archive or delete old campaigns (example: older than 1 year)
            cutoff_date = datetime.now() - timedelta(days=365)
            old_campaigns = db.query(Campaign).filter(
                Campaign.created_at < cutoff_date,
                Campaign.status == CampaignStatus.COMPLETED
            ).all()

            # You could archive these to a backup table or delete
            logger.info(f"Found {len(old_campaigns)} old campaigns for archival")

        except Exception as e:
            logger.error(f"Error during data cleanup: {str(e)}")
