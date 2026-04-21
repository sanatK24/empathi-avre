from typing import Optional, List
from sqlalchemy.orm import Session
from models import Vendor, VerificationStatus
from repositories.base_repo import BaseRepo

class VendorRepo(BaseRepo[Vendor]):
    def __init__(self):
        super().__init__(Vendor)

    def get_by_user_id(self, db: Session, user_id: int) -> Optional[Vendor]:
        return db.query(Vendor).filter(Vendor.user_id == user_id).first()

    def get_verified_in_category(self, db: Session, category: str) -> List[Vendor]:
        return db.query(Vendor).filter(
            Vendor.category == category,
            Vendor.verification_status == VerificationStatus.VERIFIED,
            Vendor.is_active == True
        ).all()

    def update_rating(self, db: Session, vendor_id: int, new_rating: float):
        vendor = self.get(db, vendor_id)
        if vendor:
            vendor.rating = new_rating
            db.commit()

vendor_repo = VendorRepo()
