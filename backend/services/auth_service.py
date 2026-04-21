from typing import Optional
from sqlalchemy.orm import Session
from models import User, UserRole
from schemas import UserCreate, SocialAuthRequest
from repositories.user_repo import user_repo
from core.security import get_password_hash, verify_password, create_access_token
from core.exceptions import AuthException, ValidationException
from services.audit import AuditService

class AuthService:
    @staticmethod
    def register_user(db: Session, user_in: UserCreate) -> User:
        if user_repo.get_by_email(db, user_in.email):
            raise ValidationException("Email already registered")
        
        if user_in.role == UserRole.ADMIN:
            raise AuthException("Cannot register as admin. Contact super admin.")

        new_user = User(
            name=user_in.name,
            email=user_in.email,
            password_hash=get_password_hash(user_in.password),
            role=user_in.role,
            phone=user_in.phone,
            city=user_in.city,
            organization_name=user_in.organization_name,
            bio=user_in.bio,
            is_active=True
        )
        user = user_repo.create_user(db, new_user)
        AuditService.log(db, "user_registered", user_id=user.id, resource_type="user", details=f"Role: {user.role}")
        return user

    @staticmethod
    def authenticate(db: Session, email: str, password: str) -> User:
        user = user_repo.get_by_email(db, email)
        if not user or not verify_password(password, user.password_hash):
            raise AuthException("Incorrect email or password")
        if not user.is_active:
            raise AuthException("User account is disabled")
        return user

    @staticmethod
    def social_sync(db: Session, auth_data: SocialAuthRequest, provider_data: dict) -> User:
        email = provider_data.get('email')
        social_id = provider_data.get('social_id')
        name = provider_data.get('name')
        avatar_url = provider_data.get('avatar_url')

        user = user_repo.get_by_email(db, email)
        
        if not user:
            # Create new user
            user = User(
                name=name,
                email=email,
                social_provider=auth_data.provider,
                social_id=social_id,
                avatar_url=avatar_url,
                role=auth_data.role or UserRole.REQUESTER,
                is_active=True
            )
            user = user_repo.create_user(db, user)
            AuditService.log(db, "social_signup", user_id=user.id, resource_type="user", details=f"Provider: {auth_data.provider}")
        else:
            # Update existing user sync details
            user.avatar_url = avatar_url
            if not user.social_id:
                user.social_id = social_id
                user.social_provider = auth_data.provider
            db.commit()
            AuditService.log(db, "social_login", user_id=user.id, resource_type="user", details=f"Provider: {auth_data.provider}")
        
        return user

    @staticmethod
    def create_token_response(user: User) -> dict:
        access_token = create_access_token(subject=user.email)
        return {"access_token": access_token, "token_type": "bearer"}
