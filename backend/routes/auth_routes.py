from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, UserRole
from schemas import UserRegister, UserLogin, UserResponse, UserRoleUpdate, UserProfileUpdate
from auth import create_access_token, exchange_google_code_for_profile, verify_token

router = APIRouter(tags=["Auth"])


def get_current_user(
    token: dict = Depends(verify_token), db: Session = Depends(get_db)
) -> User:
    user_id = token.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user

@router.post("/register", response_model=UserResponse)
def register(user: UserRegister, db: Session = Depends(get_db)):
    """Register a new user account using Google auth code exchange."""
    if not user.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization code is required",
        )

    profile = exchange_google_code_for_profile(user.code)
    email = profile.get("email")
    name = profile.get("name") or "Google User"

    # Check if email already exists
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create new user (role can be updated later via /add/role)
    db_user = User(
        name=name,
        email=email,
        password_hash=None,
        role=UserRole.REQUESTER,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login")
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate using Google auth code exchange and receive JWT token."""
    if not credentials.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization code is required",
        )

    profile = exchange_google_code_for_profile(credentials.code)
    email = profile.get("email")
    name = profile.get("name") or "Google User"

    user = db.query(User).filter(User.email == email).first()

    if not user:
        user = User(
            name=name,
            email=email,
            password_hash=None,
            role=UserRole.REQUESTER,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Create JWT token
    access_token = create_access_token(data={"sub": user.id, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
    }


@router.put("/add/role")
def add_user_role(
    payload: UserRoleUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update user role and return a refreshed JWT."""
    user.role = payload.role
    db.commit()
    db.refresh(user)

    access_token = create_access_token(data={"sub": user.id, "role": user.role})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
        },
    }


@router.get("/me", response_model=UserResponse)
def my_profile(user: User = Depends(get_current_user)):
    """Return current authenticated user profile."""
    return user


@router.put("/me", response_model=UserResponse)
def update_my_profile(
    payload: UserProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update current authenticated user profile."""
    if payload.email and payload.email != user.email:
        existing_user = db.query(User).filter(User.email == payload.email).first()
        if existing_user and existing_user.id != user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        user.email = payload.email

    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Name cannot be empty",
            )
        user.name = name

    db.commit()
    db.refresh(user)
    return user
