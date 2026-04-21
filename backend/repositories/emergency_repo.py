from typing import List
from sqlalchemy.orm import Session
from models import Request, RequestStatus, UrgencyLevel
from repositories.base_repo import BaseRepo

class EmergencyRepo(BaseRepo[Request]):
    def __init__(self):
        super().__init__(Request)

    def get_active_emergencies(self, db: Session) -> List[Request]:
        return db.query(Request).filter(
            Request.urgency_level == UrgencyLevel.CRITICAL,
            Request.status.in_([RequestStatus.PENDING, RequestStatus.MATCHED])
        ).order_by(Request.created_at.desc()).all()

    def get_nearby_emergencies(self, db: Session, city: str) -> List[Request]:
        return db.query(Request).filter(
            Request.city == city,
            Request.urgency_level.in_([UrgencyLevel.HIGH, UrgencyLevel.CRITICAL]),
            Request.status.in_([RequestStatus.PENDING, RequestStatus.MATCHED])
        ).all()

emergency_repo = EmergencyRepo()
