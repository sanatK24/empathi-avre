from typing import Optional
from sqlalchemy.orm import Session
from models import User, UserRole
from schemas import UserCreate, SocialAuthRequest
from repositories.user_repo import user_repo
from core.security import get_password_hash, verify_password, create_access_token
from core.exceptions import AuthException, ValidationException

class AuthService:
    @staticmethod
    def register_user(db: Session, user_in: UserCreate) -> User:
        # Simple email check
        if user_repo.get_by_email(db, user_in.email):
            raise ValidationException("Email already registered")
        
        # Simple user creation
        new_user = User(
            name=user_in.name,
            email=user_in.email,
            password_hash=get_password_hash(user_in.password),
            role=user_in.role or UserRole.REQUESTER,
            is_active=True,
            city=user_in.city or "Mumbai"
        )
        
        return user_repo.create_user(db, new_user)

    @staticmethod
    def authenticate(db: Session, email: str, password: str) -> User:
        user = user_repo.get_by_email(db, email)
        if not user or not verify_password(password, user.password_hash):
            raise AuthException("Incorrect email or password")
        return user

    @staticmethod
    def social_sync(db: Session, auth_data: SocialAuthRequest, provider_data: dict) -> User:
        email = provider_data.get('email')
        user = user_repo.get_by_email(db, email)
        
        if not user:
            user = User(
                name=provider_data.get('name', email),
                email=email,
                social_provider=auth_data.provider,
                social_id=provider_data.get('social_id'),
                avatar_url=provider_data.get('avatar_url'),
                role=auth_data.role or UserRole.REQUESTER,
                is_active=True
            )
            user = user_repo.create_user(db, user)
        return user

    @staticmethod
    def create_token_response(user: User) -> dict:
        access_token = create_access_token(subject=user.email)
        return {"access_token": access_token, "token_type": "bearer"}
