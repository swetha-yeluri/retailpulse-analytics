
from typing import Optional
from pydantic import BaseModel, EmailStr, Field



class CompanyRegister(BaseModel):
    company_name: str = Field(..., min_length=1)
    industry: Optional[str] = None
    company_email: EmailStr
    company_address: Optional[str] = None
    company_phone: Optional[str] = None
    owner_name: str = Field(..., min_length=1)
    owner_email: EmailStr
    password: str = Field(..., min_length=8)
    confirm_password: str
    role: str = "Company Admin"



class LoginRequest(BaseModel):
    email: EmailStr
    password: str



class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"



class RefreshRequest(BaseModel):
    refresh_token: str



class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str = Field(..., min_length=8)
    confirm_password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str