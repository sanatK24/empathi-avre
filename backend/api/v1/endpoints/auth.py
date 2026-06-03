from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from schemas import UserCreate, UserResponse, Token, UserUpdate, UserProfileResponse, EmergencyContactCreate, EmergencyContactResponse
from services.auth_service import AuthService
from api.deps import get_active_user
from models import User, EmergencyContact
from repositories.audit_repo import audit_repo
from repositories.user_repo import user_repo
from core.security import get_password_hash
router = APIRouter()
@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)): return AuthService.register_user(db, user_in)
@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)): return AuthService.create_token_response(AuthService.authenticate(db, form_data.username, form_data.password))
@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_active_user)): return current_user
@router.get("/profile", response_model=UserProfileResponse)
def get_profile(current_user: User = Depends(get_active_user), db: Session = Depends(get_db)): return current_user
@router.put("/profile", response_model=UserProfileResponse)
def update_profile(user_update: UserUpdate, current_user: User = Depends(get_active_user), db: Session = Depends(get_db)):
    update_data = user_update.model_dump(exclude_unset=True)
    if 'password' in update_data: current_user.password_hash = get_password_hash(update_data.pop('password'))
    if 'email' in update_data and (existing := user_repo.get_by_email(db, update_data['email'])) and existing.id != current_user.id: raise HTTPException(status_code=400, detail="Email already taken")
    for field, value in update_data.items(): setattr(current_user, field, value)
    db.commit(); db.refresh(current_user)
    try: audit_repo.log(db, action="update_profile", user_id=current_user.id, resource_type="user", resource_id=current_user.id, details="Updated profile details.")
    except Exception as e: print(f"Error logging profile update: {e}")
    return current_user
@router.delete("/profile")
def delete_profile(current_user: User = Depends(get_active_user), db: Session = Depends(get_db)):
    current_user.is_active = False; db.commit()
    try: audit_repo.log(db, action="deactivate_profile", user_id=current_user.id, resource_type="user", resource_id=current_user.id, details="Deactivated profile.")
    except Exception as e: print(f"Error logging profile deactivation: {e}")
    return {"status": "deleted", "message": "Profile deactivated successfully"}
@router.post("/emergency-contacts", response_model=EmergencyContactResponse)
def add_emergency_contact(contact_in: EmergencyContactCreate, current_user: User = Depends(get_active_user), db: Session = Depends(get_db)):
    contact = EmergencyContact(user_id=current_user.id, name=contact_in.name, phone=contact_in.phone, category=contact_in.category)
    db.add(contact); db.commit(); db.refresh(contact)
    try: audit_repo.log(db, action="add_emergency_contact", user_id=current_user.id, resource_type="contact", resource_id=contact.id, details=f"Added emergency contact: {contact.name}.")
    except Exception as e: print(f"Error logging add contact: {e}")
    return contact
@router.delete("/emergency-contacts/{id}")
def delete_emergency_contact(id: int, current_user: User = Depends(get_active_user), db: Session = Depends(get_db)):
    if not (contact := db.query(EmergencyContact).filter(EmergencyContact.id == id, EmergencyContact.user_id == current_user.id).first()): raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Emergency contact not found or not owned by current user")
    db.delete(contact); db.commit()
    try: audit_repo.log(db, action="delete_emergency_contact", user_id=current_user.id, resource_type="contact", resource_id=id, details="Deleted emergency contact.")
    except Exception as e: print(f"Error logging delete contact: {e}")
    return {"status": "success", "message": "Emergency contact deleted successfully"}
