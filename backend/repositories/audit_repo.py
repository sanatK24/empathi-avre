from typing import Optional
from sqlalchemy.orm import Session
from models import AuditLog
from repositories.base_repo import BaseRepo

class AuditRepo(BaseRepo[AuditLog]):
    def __init__(self):
        super().__init__(AuditLog)

    def log(
        self,
        db: Session,
        action: str,
        user_id: Optional[int] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[int] = None,
        details: Optional[str] = None
    ) -> AuditLog:
        log_entry = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry

audit_repo = AuditRepo()
