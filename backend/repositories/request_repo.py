from typing import List, Optional
from sqlalchemy.orm import Session
from models import Request, RequestStatus
from repositories.base_repo import BaseRepo

class RequestRepo(BaseRepo[Request]):
    def __init__(self):
        super().__init__(Request)

    def get_by_user(self, db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Request]:
        return (
            db.query(Request)
            .filter(Request.user_id == user_id)
            .order_by(Request.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_active_count_by_user(self, db: Session, user_id: int) -> int:
        return (
            db.query(Request)
            .filter(
                Request.user_id == user_id,
                Request.status.in_([RequestStatus.PENDING, RequestStatus.MATCHED, RequestStatus.ACCEPTED])
            )
            .count()
        )

    def get_resolved_count_by_user(self, db: Session, user_id: int) -> int:
        return (
            db.query(Request)
            .filter(
                Request.user_id == user_id,
                Request.status == RequestStatus.COMPLETED
            )
            .count()
        )

    def update_status(self, db: Session, request_id: int, status: RequestStatus) -> Optional[Request]:
        request = self.get(db, request_id)
        if request:
            request.status = status
            db.commit()
            db.refresh(request)
        return request

request_repo = RequestRepo()
