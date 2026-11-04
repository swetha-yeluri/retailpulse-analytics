from typing import List, Optional, Dict
from pydantic import BaseModel



class GovernanceDashboard(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    total_roles: int
    pending_access_requests: int
    elevated_permission_users: int        
    recent_permission_changes: int
    last_review_date: Optional[str] = None



class MatrixRow(BaseModel):
    module: str
    permissions: Dict[str, str]        


class PermissionMatrix(BaseModel):
    roles: List[str]
    rows: List[MatrixRow]



class UserAccess(BaseModel):
    id: int
    name: str
    email: str
    role: str
    status: str
    last_updated: Optional[str] = None


class RoleUpdate(BaseModel):
    new_role: str
    reason: Optional[str] = ""



class AccessRequestCreate(BaseModel):
    requested_role: str
    reason: Optional[str] = ""


class AccessRequestOut(BaseModel):
    id: int
    requested_by: str
    current_role: Optional[str] = None
    requested_role: str
    reason: Optional[str] = None
    status: str
    reviewed_by: Optional[str] = None
    review_comment: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class ReviewAction(BaseModel):
    comment: Optional[str] = ""



class ReviewCreate(BaseModel):
    user_email: str
    review_status: str                    
    review_comment: Optional[str] = ""


class AccessReviewOut(BaseModel):
    id: int
    user_email: str
    user_role: Optional[str] = None
    review_status: str
    review_comment: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True



class PermissionHistoryOut(BaseModel):
    id: int
    target_user: str
    previous_role: Optional[str] = None
    new_role: Optional[str] = None
    changed_by: str
    reason: Optional[str] = None
    timestamp: str

    class Config:
        from_attributes = True