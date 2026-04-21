from typing import List, Optional
from sqlalchemy.orm import Session
from models import Match, MatchStatus
from repositories.base_repo import BaseRepo

class MatchRepo(BaseRepo[Match]):
    def __init__(self):
        super().__init__(Match)

    def get_by_request(self, db: Session, request_id: int) -> List[Match]:
        return (
            db.query(Match)
            .filter(Match.request_id == request_id)
            .order_by(Match.score.desc())
            .all()
        )

    def get_accepted_match(self, db: Session, request_id: int) -> Optional[Match]:
        return (
            db.query(Match)
            .filter(
                Match.request_id == request_id, 
                Match.status == MatchStatus.ACCEPTED_BY_REQUESTER
            )
            .first()
        )

    def cancel_other_matches(self, db: Session, request_id: int, accepted_vendor_id: int):
        db.query(Match).filter(
            Match.request_id == request_id,
            Match.vendor_id != accepted_vendor_id,
            Match.status.in_([MatchStatus.PENDING, MatchStatus.ACCEPTED_BY_VENDOR]),
        ).update(
            {Match.status: MatchStatus.CANCELLED_BY_REQUESTER},
            synchronize_session=False,
        )
        db.commit()

match_repo = MatchRepo()
