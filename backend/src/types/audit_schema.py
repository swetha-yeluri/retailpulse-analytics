"""Audit log schema (Task 1 + 2)."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: int
    user_email: Optional[str] = None
    action: str
    target_name: Optional[str] = None
    ip_address: Optional[str] = None
    browser: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True