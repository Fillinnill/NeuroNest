from pydantic import BaseModel
from typing import Optional


class GuardianVerifyRequest(BaseModel):
    student_username: str
    student_password: Optional[str] = None
    student_verification_code: Optional[str] = None


class GuardianVerifyResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    student_id: int
    student_name: str
    guardian_name: str


class AccessLogEntry(BaseModel):
    id: int
    message: str
    type: str
    is_read: int
    created_at: str

    class Config:
        from_attributes = True
