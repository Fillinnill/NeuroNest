from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    email: EmailStr
    username: str
    fullname: Optional[str] = None
    age: Optional[int] = None
    anxiety_level: Optional[int] = None
    communication_goals: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(UserBase):
    password: Optional[str] = None

class UserInDBBase(UserBase):
    id: int

    class Config:
        from_attributes = True

class User(UserInDBBase):
    role: Optional[str] = "child"

class Token(BaseModel):
    access_token: str
    token_type: str
    role: Optional[str] = None

class TokenPayload(BaseModel):
    sub: Optional[int] = None
