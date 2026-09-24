from typing import List, Optional
from pydantic import BaseModel



class QualityDashboard(BaseModel):
    total_records_checked: int
    valid_records: int
    warnings: int
    errors: int
    unresolved_issues: int
    last_reconciliation: Optional[str] = None



class IssueOut(BaseModel):
    id: int
    issue_type: str
    severity: str
    affected_module: str
    affected_record: Optional[str] = None
    description: str
    status: str
    detected_at: str

    class Config:
        from_attributes = True



class IssueDetail(IssueOut):
    details: Optional[str] = None          
    resolved_by: Optional[str] = None
    resolved_at: Optional[str] = None
    resolution_note: Optional[str] = None
    previous_status: Optional[str] = None



class IssueResolve(BaseModel):
    status: str                              
    resolution_note: Optional[str] = ""



class ReconciliationResult(BaseModel):
    execution_id: int
    records_checked: int
    issues_detected: int
    issues_resolved: int
    failed_checks: int
    status: str



class ReconciliationHistoryOut(BaseModel):
    id: int
    triggered_by: str
    records_checked: int
    issues_detected: int
    issues_resolved: int
    failed_checks: int
    status: str
    started_at: str
    completed_at: Optional[str] = None

    class Config:
        from_attributes = True