from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Campaign, Donation, DonationStatus
from auth import get_current_user
from services.audit import AuditService
from schemas import PaymentProcess
from typing import Optional
from datetime import datetime
import random
import string

router = APIRouter(prefix="/payments", tags=["payments"])

def generate_transaction_id():
    """Generate simulated transaction ID"""
    return f"TXN{''.join(random.choices(string.ascii_uppercase + string.digits, k=12))}"

# ============ SIMULATE PAYMENT FLOW ============
@router.post("/process")
def process_payment(
    payment_data: PaymentProcess,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Simulate payment processing

    Payload:
    {
        "campaign_id": int,
        "amount": float,
        "payment_method": "upi|card|wallet|bank",
        "anonymous": bool,
        "message": str (optional),
        "donor_details": {
            "full_name": str (optional, for card/bank),
            "email": str (optional),
            "phone": str (optional)
        }
    }
    """
    try:
        campaign_id = payment_data.campaign_id
        amount = payment_data.amount
        payment_method = payment_data.payment_method
        anonymous = payment_data.anonymous
        message = payment_data.message

        # Validate campaign
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        if campaign.status != "active":
            raise HTTPException(status_code=400, detail="Campaign is not active")

        # Validate amount
        if not amount or amount <= 0:
            raise HTTPException(status_code=400, detail="Invalid amount")

        # Simulate payment processing
        transaction_id = generate_transaction_id()

        # 95% success rate for simulation
        is_success = random.random() < 0.95

        if not is_success:
            AuditService.log(
                db,
                action="payment_failed",
                user_id=current_user.id,
                resource_type="payment",
                details=f"Transaction: {transaction_id}, Campaign: {campaign_id}, Amount: {amount}"
            )
            return {
                "status": "failed",
                "transaction_id": transaction_id,
                "error": "Payment processing failed. Please try again.",
                "retry_available": True
            }

        # Create donation record
        new_donation = Donation(
            campaign_id=campaign_id,
            user_id=current_user.id,
            amount=amount,
            anonymous=anonymous,
            message=message,
            status=DonationStatus.COMPLETED
        )

        # Update campaign raised amount
        campaign.raised_amount += amount

        # Check if campaign is fully funded
        if campaign.raised_amount >= campaign.goal_amount:
            campaign.status = "completed"

        db.add(new_donation)
        db.commit()
        db.refresh(new_donation)

        # Audit log
        AuditService.log(
            db,
            action="payment_completed",
            user_id=current_user.id,
            resource_type="donation",
            resource_id=new_donation.id,
            details=f"Transaction: {transaction_id}, Amount: {amount}, Method: {payment_method}"
        )

        return {
            "status": "success",
            "transaction_id": transaction_id,
            "donation_id": new_donation.id,
            "campaign_id": campaign_id,
            "amount": amount,
            "payment_method": payment_method,
            "timestamp": datetime.now().isoformat(),
            "message": f"Thank you! Your donation of ₹{amount} has been processed successfully."
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Payment processing error: {str(e)}")
        raise HTTPException(status_code=500, detail="Payment processing error")

# ============ GET PAYMENT METHODS ============
@router.get("/methods")
def get_payment_methods():
    """Get available payment methods for simulation"""
    return {
        "methods": [
            {
                "id": "upi",
                "name": "UPI",
                "icon": "💳",
                "description": "Instant payment via UPI",
                "fields": ["upi_id"]
            },
            {
                "id": "card",
                "name": "Debit/Credit Card",
                "icon": "🏧",
                "description": "Visa, Mastercard, Amex",
                "fields": ["card_number", "expiry", "cvv"]
            },
            {
                "id": "wallet",
                "name": "Digital Wallet",
                "icon": "📱",
                "description": "Google Pay, Apple Pay",
                "fields": ["phone"]
            },
            {
                "id": "bank",
                "name": "Bank Transfer",
                "icon": "🏦",
                "description": "Direct bank transfer",
                "fields": ["account_number"]
            }
        ]
    }

# ============ GET TRANSACTION HISTORY ============
@router.get("/history")
def get_payment_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 20,
    offset: int = 0
):
    """Get user's payment/donation history"""
    donations = db.query(Donation).filter(
        Donation.user_id == current_user.id
    ).order_by(Donation.created_at.desc()).limit(limit).offset(offset).all()

    result = []
    for donation in donations:
        campaign = db.query(Campaign).filter(Campaign.id == donation.campaign_id).first()
        result.append({
            "donation_id": donation.id,
            "campaign_id": donation.campaign_id,
            "campaign_title": campaign.title if campaign else "Unknown",
            "amount": donation.amount,
            "status": donation.status,
            "timestamp": donation.created_at,
            "message": donation.message
        })

    return result

# ============ VERIFY PAYMENT ============
@router.get("/verify/{transaction_id}")
def verify_payment(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Verify payment status by transaction ID"""
    # In real implementation, would query payment gateway
    # For simulation, check if donation exists
    donation = db.query(Donation).filter(
        Donation.id == int(transaction_id.replace('TXN', '')[-4:]) if transaction_id.startswith('TXN') else None
    ).first()

    return {
        "transaction_id": transaction_id,
        "status": "verified" if donation else "pending",
        "verified_at": datetime.now().isoformat() if donation else None
    }
