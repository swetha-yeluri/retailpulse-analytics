
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: int
    user_email: Optional[str] = None
    action: str
    ip_address: Optional[str] = None
    browser: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True