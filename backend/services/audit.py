from sqlalchemy.orm import Session
from models import AuditLog
from typing import Optional

class AuditService:
    @staticmethod
    def log(
        db: Session, 
        action: str, 
        user_id: Optional[int] = None, 
        resource_type: Optional[str] = None, 
        resource_id: Optional[int] = None, 
        details: Optional[str] = None
    ):
        log_entry = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details
        )
        db.add(log_entry)
        db.commit()
