
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserProfile(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    company_id: int
    company_name: str = ""
    status: str
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class CompanyOut(BaseModel):
    id: int
    name: str
    industry: Optional[str] = None
    email: EmailStr

    class Config:
        from_attributes = True