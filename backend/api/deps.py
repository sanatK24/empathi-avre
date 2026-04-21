from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from database import get_db
from models import User, UserRole
from core.security import SECRET_KEY, ALGORITHM
from core.exceptions import AuthException
from repositories.user_repo import user_repo

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(
    db: Session = Depends(get_db), 
    token: str = Depends(oauth2_scheme)
) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise AuthException("Could not validate credentials")
    except JWTError:
        raise AuthException("Could not validate credentials")
    
    user = user_repo.get_by_email(db, email)
    if not user:
        raise AuthException("User not found")
    return user

def get_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise AuthException("Inactive user")
    return current_user

def get_current_admin(current_user: User = Depends(get_active_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user
