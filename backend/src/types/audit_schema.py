from typing import List, Optional
from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: int
    user_email: Optional[str] = None
    action: str
    target_name: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    ip_address: Optional[str] = None
    browser: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class AuditLogDetail(AuditLogOut):
    before_values: Optional[str] = None
    after_values: Optional[str] = None


class FilterOptions(BaseModel):
    users: List[str]
    actions: List[str]
    resources: List[str]