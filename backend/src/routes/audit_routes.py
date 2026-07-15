
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.services import audit_service
from src.types.audit_schema import AuditLogOut
from src.utils.deps import require_admin

router = APIRouter(prefix="/api", tags=["Audit Logs"])


@router.get("/audit-logs", response_model=list[AuditLogOut])
def get_audit_logs(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return audit_service.list_logs(db, admin)