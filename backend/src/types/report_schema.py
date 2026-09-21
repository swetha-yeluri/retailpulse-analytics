from typing import List, Optional, Any
from pydantic import BaseModel



class ReportResult(BaseModel):
    report_type: str
    report_name: str
    columns: List[str]                   
    rows: List[dict]                     
    total_records: int
    filters_applied: dict              
    generated_at: str



class ReportHistoryOut(BaseModel):
    id: int
    report_type: str
    report_name: str
    generated_by: str
    filters_applied: Optional[str] = None
    format: str
    total_records: int
    status: str
    created_at: str

    class Config:
        from_attributes = True



class ScheduleCreate(BaseModel):
    report_type: str
    schedule_name: str
    filters: Optional[dict] = {}
    frequency: str                       
    execution_time: Optional[str] = "09:00"
    recipients: Optional[str] = ""       
    export_format: Optional[str] = "PDF"
    is_active: Optional[bool] = True


class ScheduleUpdate(BaseModel):
    schedule_name: Optional[str] = None
    filters: Optional[dict] = None
    frequency: Optional[str] = None
    execution_time: Optional[str] = None
    recipients: Optional[str] = None
    export_format: Optional[str] = None
    is_active: Optional[bool] = None


class ScheduleOut(BaseModel):
    id: int
    report_type: str
    schedule_name: str
    filters: Optional[str] = None
    frequency: str
    execution_time: Optional[str] = None
    recipients: Optional[str] = None
    export_format: str
    is_active: bool
    created_by: str
    last_run: Optional[str] = None
    last_status: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True