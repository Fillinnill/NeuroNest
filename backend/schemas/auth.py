from pydantic import BaseModel, Field

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, description="Username or email used for login")
    password: str = Field(..., min_length=1, description="Plain text password")

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
