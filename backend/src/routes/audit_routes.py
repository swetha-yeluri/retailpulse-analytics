from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.services import audit_service
from src.types.audit_schema import AuditLogDetail, FilterOptions
from src.utils.deps import require_admin

router = APIRouter(prefix="/api", tags=["Audit Logs"])


def _serialize(log):
    return {
        "id": log.id, "user_email": log.user_email, "action": log.action,
        "target_name": log.target_name, "resource_type": log.resource_type,
        "resource_id": log.resource_id, "description": log.description,
        "status": log.status, "ip_address": log.ip_address,
        "browser": log.browser, "created_at": str(log.created_at),
        "before_values": getattr(log, "before_values", None),
        "after_values": getattr(log, "after_values", None),
    }



@router.get("/audit-logs/filters", response_model=FilterOptions)
def get_filters(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return audit_service.get_filter_options(db, admin)


@router.get("/audit-logs")
def get_audit_logs(
    user: str = "", action: str = "", resource_type: str = "",
    status: str = "", search: str = "",
    date_from: Optional[str] = None, date_to: Optional[str] = None,
    sort: str = "newest", page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db), admin=Depends(require_admin),
):
    df = datetime.strptime(date_from, "%Y-%m-%d") if date_from else None
    dt = datetime.strptime(date_to + " 23:59:59", "%Y-%m-%d %H:%M:%S") if date_to else None

    result = audit_service.list_logs(
        db, admin, user, action, resource_type, status, search,
        df, dt, sort, page, limit)

    return {
        "total": result["total"], "page": result["page"], "limit": result["limit"],
        "logs": [_serialize(l) for l in result["logs"]],
    }


@router.get("/audit-logs/{log_id}", response_model=AuditLogDetail)
def get_audit_log(log_id: int, db: Session = Depends(get_db),
                  admin=Depends(require_admin)):
    log = audit_service.get_log(db, admin, log_id)
    return _serialize(log)