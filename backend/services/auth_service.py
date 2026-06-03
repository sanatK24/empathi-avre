from typing import Optional
from sqlalchemy.orm import Session
from models import User, UserRole
from schemas import UserCreate
from repositories.user_repo import user_repo
from core.security import get_password_hash, verify_password, create_access_token
from core.exceptions import AuthException, ValidationException

class AuthService:

    @staticmethod
    def register_user(db: Session, user_in: UserCreate) -> User:
        if user_repo.get_by_email(db, user_in.email):
            raise ValidationException('Email already registered')
        new_user = User(name=user_in.name, email=user_in.email, password_hash=get_password_hash(user_in.password), role=user_in.role or UserRole.USER, is_active=True, city=user_in.city or 'Mumbai')
        user = user_repo.create_user(db, new_user)
        try:
            from repositories.audit_repo import audit_repo
            audit_repo.log(db, action='register', user_id=user.id, resource_type='user', resource_id=user.id, details=f'User {user.name} registered.')
        except Exception as e:
            print(f'Error logging signup: {e}')
        return user

    @staticmethod
    def authenticate(db: Session, email: str, password: str) -> User:
        user = user_repo.get_by_email(db, email)
        if not user or not verify_password(password, user.password_hash):
            raise AuthException('Incorrect email or password')
        try:
            from repositories.audit_repo import audit_repo
            audit_repo.log(db, action='login', user_id=user.id, resource_type='user', resource_id=user.id, details=f'User {user.name} logged in.')
        except Exception as e:
            print(f'Error logging login: {e}')
        return user

    @staticmethod
    def create_token_response(user: User) -> dict:
        access_token = create_access_token(subject=user.email)
        return {'access_token': access_token, 'token_type': 'bearer'}