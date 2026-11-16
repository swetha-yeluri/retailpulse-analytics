from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime



class IntegrationDashboard(BaseModel):
    total_integrations: int
    active_integrations: int
    inactive_integrations: int
    failed_integrations: int
    last_sync_at: Optional[datetime] = None
    pending_jobs: int
    records_synced: int
    records_failed: int



class IntegrationCreate(BaseModel):
    name: str
    source_type: str                
    target_module: str               
    auth_method: str = "None"
    sync_frequency: str = "Manual"
    config: Dict[str, Any] = {}       
    secret: Optional[str] = ""        


class IntegrationUpdate(BaseModel):
    name: Optional[str] = None
    target_module: Optional[str] = None
    auth_method: Optional[str] = None
    sync_frequency: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    secret: Optional[str] = None


class IntegrationOut(BaseModel):
    id: int
    name: str
    source_type: str
    target_module: str
    auth_method: str
    sync_frequency: str
    config: Dict[str, Any] = {}      
    has_secret: bool = False           
    status: str
    last_sync_at: Optional[datetime] = None
    last_sync_status: Optional[str] = None
    created_by: str
    created_at: datetime

    class Config:
        from_attributes = True



class ConnectionTestResult(BaseModel):
    success: bool
    message: str
    details: Optional[str] = None      



class MappingItem(BaseModel):
    source_field: str
    target_field: str
    is_required: bool = False
    data_type: str = "string"


class MappingSave(BaseModel):
    mappings: List[MappingItem]


class MappingOut(BaseModel):
    id: int
    source_field: str
    target_field: str
    is_required: bool
    data_type: str

    class Config:
        from_attributes = True



class SyncTrigger(BaseModel):
    sync_type: str = "Manual"        
    strategy: str = "Insert"           


class SyncHistoryOut(BaseModel):
    id: int
    integration_id: int
    integration_name: str
    triggered_by: str
    sync_type: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_seconds: int
    records_processed: int
    records_inserted: int
    records_updated: int
    records_skipped: int
    records_failed: int
    status: str
    summary: Optional[str] = ""

    class Config:
        from_attributes = True



class FailedRecordOut(BaseModel):
    id: int
    sync_id: int
    source_identifier: Optional[str] = None
    row_number: Optional[int] = None
    error_category: Optional[str] = None
    error_message: Optional[str] = None
    processing_status: str

    class Config:
        from_attributes = True



class ScheduleCreate(BaseModel):
    integration_id: int
    frequency: str = "Daily"
    execution_time: str = "09:00"
    is_active: bool = True


class ScheduleOut(BaseModel):
    id: int
    integration_id: int
    frequency: str
    execution_time: str
    is_active: bool
    next_run: Optional[datetime] = None
    last_run: Optional[datetime] = None
    last_result: Optional[str] = None

    class Config:
        from_attributes = True