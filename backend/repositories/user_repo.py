from typing import Optional
from sqlalchemy.orm import Session
from models import User
from repositories.base_repo import BaseRepo

class UserRepo(BaseRepo[User]):
    def __init__(self):
        super().__init__(User)

    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    def get_by_social_id(self, db: Session, social_id: str, provider: str) -> Optional[User]:
        return db.query(User).filter(
            User.social_id == social_id, 
            User.social_provider == provider
        ).first()

    def create_user(self, db: Session, user_obj: User) -> User:
        db.add(user_obj)
        db.commit()
        db.refresh(user_obj)
        return user_obj

user_repo = UserRepo()
