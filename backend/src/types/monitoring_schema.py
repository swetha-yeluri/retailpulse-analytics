from typing import List, Optional
from pydantic import BaseModel



class ComponentHealth(BaseModel):
    component: str                        
    status: str                           
    detail: Optional[str] = None


class HealthResponse(BaseModel):
    overall_status: str                 
    components: List[ComponentHealth]
    last_checked: str



class HealthDashboard(BaseModel):
    overall_status: str
    api_available: bool
    avg_response_time: float              
    failed_api_requests: int
    jobs_completed: int
    jobs_failed: int
    active_pending_jobs: int
    recent_errors: int
    last_health_check: str



class JobOut(BaseModel):
    job_id: str                         
    job_type: str                         
    triggered_by: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    duration: float
    status: str                           
    retry_count: int
    failure_reason: Optional[str] = None



class ErrorOut(BaseModel):
    id: int
    error_category: str
    affected_component: str
    source: Optional[str] = None
    severity: str
    message: str
    occurrence_count: int
    status: str
    first_seen: str
    last_seen: str

    class Config:
        from_attributes = True



class IncidentCreate(BaseModel):
    title: str
    affected_component: Optional[str] = None
    severity: Optional[str] = "Medium"
    description: Optional[str] = None


class IncidentUpdate(BaseModel):
    status: str                          
    note: Optional[str] = None
    resolution: Optional[str] = None


class IncidentHistoryItem(BaseModel):
    action: str
    performed_by: str
    note: Optional[str] = None
    timestamp: str


class IncidentOut(BaseModel):
    id: int
    title: str
    affected_component: Optional[str] = None
    severity: str
    status: str
    description: Optional[str] = None
    investigation_notes: Optional[str] = None
    resolution: Optional[str] = None
    created_by: Optional[str] = None
    resolved_by: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class IncidentDetail(IncidentOut):
    history: List[IncidentHistoryItem] = []