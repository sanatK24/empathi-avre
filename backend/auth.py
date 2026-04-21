# Legacy Auth Bridge
# DEPRECATED: Use core.security and api.deps instead.
from typing import List
from fastapi import Depends
from api.deps import get_current_user, oauth2_scheme
from core.security import verify_password, get_password_hash, create_access_token
from models import User, UserRole
from core.exceptions import ForbiddenException

# Re-exporting the dependency
get_current_user = get_current_user

def check_role(roles: List[UserRole]):
    async def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise ForbiddenException("You do not have enough permissions to access this resource")
        return current_user
    return role_checker
