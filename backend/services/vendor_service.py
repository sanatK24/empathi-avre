from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from models import User, Vendor, UserRole, Match, MatchStatus, Inventory
from schemas import VendorProfileCreate
from repositories.vendor_repo import vendor_repo
from core.exceptions import NotFoundException, ValidationException
from services.audit import AuditService

class VendorService:
    @staticmethod
    def get_or_create_profile(db: Session, user: User, data: VendorProfileCreate) -> Vendor:
        # Side effect: Ensure user role is VENDOR
        if user.role != UserRole.VENDOR:
            user.role = UserRole.VENDOR
            db.commit()

        vendor = vendor_repo.get_by_user_id(db, user.id)
        if vendor:
            # Update existing
            for key, value in data.dict().items():
                setattr(vendor, key, value)
            AuditService.log(db, "vendor_profile_updated", user_id=user.id, resource_id=vendor.id, resource_type="vendor")
        else:
            # Create new
            vendor = Vendor(user_id=user.id, **data.dict())
            db.add(vendor)
            db.commit()
            db.refresh(vendor)
            AuditService.log(db, "vendor_profile_created", user_id=user.id, resource_id=vendor.id, resource_type="vendor")
        
        db.commit()
        return vendor

    @staticmethod
    def get_stats(db: Session, vendor: Vendor) -> Dict[str, Any]:
        # Implementation of analytics logic moved from routes
        inventory_items = db.query(Inventory).filter(Inventory.vendor_id == vendor.id).all()
        value_sum = sum((item.price or 0) * item.quantity for item in inventory_items)
        
        low_stock_count = sum(1 for item in inventory_items if item.quantity <= item.reorder_level)
        
        active_matches = db.query(Match).filter(
            Match.vendor_id == vendor.id,
            Match.status == MatchStatus.PENDING
        ).count()
        
        return {
            "total_value": f"₹{value_sum:,.0f}",
            "low_stock_alerts": f"{low_stock_count} Items",
            "active_requests": str(active_matches),
            "avg_response_time": f"{vendor.avg_response_time}m",
            "reliability_score": f"{vendor.reliability_score * 100:.1f}%",
            "market_analytics": {
                "trending_product": "Data pending",
                "demand_increase": 0
            }
        }
