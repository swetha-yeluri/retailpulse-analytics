from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.services import data_quality_service
from src.types.data_quality_schema import (
    QualityDashboard, IssueOut, IssueDetail, IssueResolve,
    ReconciliationResult, ReconciliationHistoryOut,
)
from src.utils.deps import require_admin

router = APIRouter(prefix="/api/data-quality", tags=["Data Quality"])



@router.get("/dashboard", response_model=QualityDashboard)
def dashboard(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return data_quality_service.get_dashboard(db, admin)



@router.post("/reconcile", response_model=ReconciliationResult)
def reconcile(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return data_quality_service.run_reconciliation(db, admin)



@router.get("/issues/filters")
def issue_filters(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return data_quality_service.get_filter_options(db, admin)


@router.get("/issues", response_model=list[IssueOut])
def list_issues(
    issue_type: str = "", severity: str = "", module: str = "",
    status: str = "", search: str = "",
    date_from: Optional[str] = None, date_to: Optional[str] = None,
    db: Session = Depends(get_db), admin=Depends(require_admin),
):
    df = datetime.strptime(date_from, "%Y-%m-%d") if date_from else None
    dt = datetime.strptime(date_to + " 23:59:59", "%Y-%m-%d %H:%M:%S") if date_to else None
    return data_quality_service.list_issues(
        db, admin, issue_type, severity, module, status, search, df, dt)


@router.get("/issues/{issue_id}", response_model=IssueDetail)
def get_issue(issue_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    return data_quality_service.get_issue(db, admin, issue_id)


@router.put("/issues/{issue_id}/resolve", response_model=IssueDetail)
def resolve_issue(issue_id: int, data: IssueResolve,
                  db: Session = Depends(get_db), admin=Depends(require_admin)):
    return data_quality_service.resolve_issue(db, admin, issue_id, data)



@router.get("/history", response_model=list[ReconciliationHistoryOut])
def history(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return data_quality_service.get_reconciliation_history(db, admin)