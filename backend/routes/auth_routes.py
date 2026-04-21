from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, UserRole
from schemas import UserCreate, UserResponse, Token, UserUpdate, SocialAuthRequest
from auth import get_password_hash, verify_password, create_access_token, get_current_user
from fastapi.security import OAuth2PasswordRequestForm
from services.audit import AuditService
from config import settings
import secrets
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/social", response_model=Token)
def social_login(auth_data: SocialAuthRequest, db: Session = Depends(get_db)):
    email = None
    name = None
    social_id = None
    avatar_url = None
    
    if auth_data.provider == "google":
        try:
            # Try to get user info from Google using the token
            import requests as py_requests
            userinfo_response = py_requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {auth_data.token}"}
            )
            
            if userinfo_response.ok:
                idinfo = userinfo_response.json()
                email = idinfo['email']
                name = idinfo.get('name', email.split('@')[0])
                social_id = idinfo.get('sub') # Google user ID
                avatar_url = idinfo.get('picture')
            else:
                # Fallback to ID token verification if it was actually an ID token
                try:
                    idinfo = id_token.verify_oauth2_token(
                        auth_data.token, 
                        google_requests.Request(), 
                        settings.GOOGLE_CLIENT_ID
                    )
                    email = idinfo['email']
                    name = idinfo.get('name', email.split('@')[0])
                    social_id = idinfo.get('sub')
                    avatar_url = idinfo.get('picture')
                except Exception:
                    raise HTTPException(status_code=401, detail="Invalid Google token (Access Token or ID Token)")
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Google authentication failed: {str(e)}")


    else:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    if not email:
        raise HTTPException(status_code=400, detail="Could not retrieve email from provider")

    # Check if user exists by social_id or email
    user = db.query(User).filter((User.social_id == social_id) | (User.email == email)).first()
    
    if not user:
        # Create new user for social signup
        user = User(
            name=name,
            email=email,
            social_provider=auth_data.provider,
            social_id=social_id,
            avatar_url=avatar_url,
            role=auth_data.role or UserRole.REQUESTER,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        AuditService.log(db, "social_signup", user_id=user.id, resource_type="user", details=f"Provider: {auth_data.provider}")
    else:
        # Update social ID and avatar if not set
        user.avatar_url = avatar_url # Always keep avatar fresh
        if not user.social_id:
            user.social_id = social_id
            user.social_provider = auth_data.provider
        db.commit()
        AuditService.log(db, "social_login", user_id=user.id, resource_type="user", details=f"Provider: {auth_data.provider}")



    # Generate access token
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Security Fix: Prevent self-registration as ADMIN
    if user_in.role == UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Cannot register as admin. Contact super admin.")
    
    new_user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role,
        phone=user_in.phone,
        city=user_in.city,
        organization_name=user_in.organization_name,
        bio=user_in.bio,
        is_active=user_in.is_active
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    AuditService.log(db, "user_registered", user_id=new_user.id, resource_type="user", details=f"Role: {new_user.role}")
    
    return new_user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}
@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/profile", response_model=UserResponse)
def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user_update.name is not None:
        current_user.name = user_update.name
    if user_update.email is not None:
        # Check if email is already taken
        existing_user = db.query(User).filter(User.email == user_update.email, User.id != current_user.id).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already taken")
        current_user.email = user_update.email
    if user_update.phone is not None:
        current_user.phone = user_update.phone
    if user_update.city is not None:
        current_user.city = user_update.city
    if user_update.organization_name is not None:
        current_user.organization_name = user_update.organization_name
    if user_update.bio is not None:
        current_user.bio = user_update.bio
    if user_update.password is not None:
        current_user.password_hash = get_password_hash(user_update.password)
    
    db.commit()
    db.refresh(current_user)
    AuditService.log(db, "profile_updated", user_id=current_user.id, resource_type="user")
    return current_user

@router.delete("/profile")
def delete_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.is_active = False
    db.commit()
    AuditService.log(db, "account_deactivated", user_id=current_user.id, resource_type="user")
    return {"message": "Account deactivated"}
