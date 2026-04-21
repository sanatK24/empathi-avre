from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from schemas import UserCreate, UserResponse, Token, SocialAuthRequest, UserUpdate, UserProfileResponse, UserEmergencyContactBase, UserEmergencyContactResponse
from services.auth_service import AuthService
from api.deps import get_current_user, get_active_user
from models import User
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from config import settings
import requests as py_requests

router = APIRouter()

@router.post("/social", response_model=Token)
def social_login(auth_data: SocialAuthRequest, db: Session = Depends(get_db)):
    provider_data = {}
    
    if auth_data.provider == "google":
        try:
            userinfo_response = py_requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {auth_data.token}"}
            )
            
            if userinfo_response.ok:
                idinfo = userinfo_response.json()
                provider_data = {
                    "email": idinfo['email'],
                    "name": idinfo.get('name', idinfo['email'].split('@')[0]),
                    "social_id": idinfo.get('sub'),
                    "avatar_url": idinfo.get('picture')
                }
            else:
                # Fallback to ID token verification
                idinfo = id_token.verify_oauth2_token(
                    auth_data.token, 
                    google_requests.Request(), 
                    settings.GOOGLE_CLIENT_ID
                )
                provider_data = {
                    "email": idinfo['email'],
                    "name": idinfo.get('name', idinfo['email'].split('@')[0]),
                    "social_id": idinfo.get('sub'),
                    "avatar_url": idinfo.get('picture')
                }
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Google authentication failed: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    user = AuthService.social_sync(db, auth_data, provider_data)
    return AuthService.create_token_response(user)

@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    return AuthService.register_user(db, user_in)

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = AuthService.authenticate(db, form_data.username, form_data.password)
    return AuthService.create_token_response(user)

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_active_user)):
    return current_user

@router.get("/profile", response_model=UserProfileResponse)
def get_profile(current_user: User = Depends(get_active_user)):
    return current_user

@router.put("/profile", response_model=UserProfileResponse)
def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_active_user),
    db: Session = Depends(get_db)
):
    update_data = user_update.model_dump(exclude_unset=True)
    
    if 'password' in update_data:
        from core.security import get_password_hash
        current_user.password_hash = get_password_hash(update_data.pop('password'))
        
    if 'email' in update_data:
        from repositories.user_repo import user_repo
        existing = user_repo.get_by_email(db, update_data['email'])
        if existing and existing.id != current_user.id:
            raise HTTPException(status_code=400, detail="Email already taken")

    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/emergency-contacts", response_model=UserEmergencyContactResponse)
def add_emergency_contact(
    contact_in: UserEmergencyContactBase,
    current_user: User = Depends(get_active_user),
    db: Session = Depends(get_db)
):
    from models import UserEmergencyContact
    contact = UserEmergencyContact(
        user_id=current_user.id,
        name=contact_in.name,
        phone=contact_in.phone,
        category=contact_in.category
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact

@router.delete("/emergency-contacts/{contact_id}")
def delete_emergency_contact(
    contact_id: int,
    current_user: User = Depends(get_active_user),
    db: Session = Depends(get_db)
):
    from models import UserEmergencyContact
    contact = db.query(UserEmergencyContact).filter(
        UserEmergencyContact.id == contact_id,
        UserEmergencyContact.user_id == current_user.id
    ).first()
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
        
    db.delete(contact)
    db.commit()
    return {"status": "deleted"}
