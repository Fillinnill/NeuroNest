from typing import List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from core.config import settings
from core.security import TokenData
from db.session import get_db
from db import models

# Point to our login endpoint for the Swagger UI Authorize button
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_current_user(
    db: Session = Depends(get_db), 
    token: str = Depends(oauth2_scheme)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        jwt_role = payload.get("role")
        print(f"[Auth Debug] Token decoding success. JWT role payload: '{jwt_role}' (sub: {user_id})")
        if user_id is None:
            print("[Auth Debug] Token decoding failed: 'sub' claim missing.")
            raise credentials_exception
    except JWTError as e:
        print(f"[Auth Debug] Token decoding failed: JWTError ({e})")
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        print(f"[Auth Debug] User ID '{user_id}' from JWT sub not found in database.")
        raise credentials_exception
    
    print(f"[Auth Debug] Detected role: '{user.role}' for user '{user.username}' (ID: {user.id})")
    return user

def check_role(allowed_roles: List[str]):
    def role_checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            print(f"[Auth Debug] Rejected role: '{current_user.role}' in check_role (allowed: {allowed_roles}) for user '{current_user.username}' (ID: {current_user.id})")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have enough permissions"
            )
        return current_user
    return role_checker

def require_parent(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role != "parent":
        print(f"[Auth Debug] Rejected role: '{current_user.role}' in require_parent for user '{current_user.username}' (ID: {current_user.id})")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only parents or guardians have access to this resource."
        )
    return current_user

def require_child(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role != "child":
        print(f"[Auth Debug] Rejected role: '{current_user.role}' in require_child for user '{current_user.username}' (ID: {current_user.id})")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students or learners have access to this resource."
        )
    return current_user

