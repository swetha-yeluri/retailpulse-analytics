from typing import List, Optional
from pydantic import BaseModel



class RequestCreate(BaseModel):
    request_type: str                     
    related_record: Optional[str] = None  
    related_id: Optional[int] = None      
    current_values: Optional[dict] = {}   
    requested_values: dict                
    reason: Optional[str] = ""
    priority: Optional[str] = "Normal"



class RequestOut(BaseModel):
    id: int
    request_type: str
    requested_by: str
    related_record: Optional[str] = None
    status: str
    priority: str
    reason: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True



class HistoryItem(BaseModel):
    action: str
    performed_by: str
    comment: Optional[str] = None
    timestamp: str



class RequestDetail(RequestOut):
    current_values: Optional[str] = None  
    requested_values: Optional[str] = None 
    reviewed_by: Optional[str] = None
    review_comment: Optional[str] = None
    reviewed_at: Optional[str] = None
    related_id: Optional[int] = None
    history: List[HistoryItem] = []       



class ReviewAction(BaseModel):
    comment: Optional[str] = ""          



class ConfigCreate(BaseModel):
    request_type: str
    approver_role: Optional[str] = "Company Admin"
    approval_required: Optional[bool] = True
    is_active: Optional[bool] = True


class ConfigOut(BaseModel):
    id: int
    request_type: str
    approver_role: str
    approval_required: bool
    is_active: bool

    class Config:
        from_attributes = True