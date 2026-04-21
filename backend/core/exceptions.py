from typing import Any, Dict, Optional
from fastapi import HTTPException, status

class EmpathIException(HTTPException):
    def __init__(
        self,
        status_code: int,
        detail: Any = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> None:
        super().__init__(status_code=status_code, detail=detail, headers=headers)

class AuthException(EmpathIException):
    def __init__(self, detail: str = "Authentication failed") -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )

class ForbiddenException(EmpathIException):
    def __init__(self, detail: str = "Permission denied") -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )

class NotFoundException(EmpathIException):
    def __init__(self, resource: str = "Resource", identifier: Any = None) -> None:
        detail = f"{resource} not found"
        if identifier:
            detail = f"{resource} with identifier {identifier} not found"
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
        )

class ValidationException(EmpathIException):
    def __init__(self, detail: str = "Validation error") -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )
