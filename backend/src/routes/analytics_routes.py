
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.services import analytics_service, audit_service
from src.types.analytics_schema import AnalyticsResponse
from src.utils.deps import require_active_user

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("", response_model=AnalyticsResponse)
def get_analytics(from_date: Optional[str] = None, to_date: Optional[str] = None,
                  category_id: Optional[int] = None, channel: str = "",
                  payment: str = "",
                  db: Session = Depends(get_db), user=Depends(require_active_user)):
    # audit: dashboard viewed (with filters if applied)
    if from_date or to_date or category_id or channel or payment:
        audit_service.write_log(db, user.company_id, user.email,
                                "Analytics Filters Applied", "Dashboard")
    else:
        audit_service.write_log(db, user.company_id, user.email,
                                "Dashboard Viewed", "Analytics")
    return analytics_service.get_analytics(
        db, user, from_date, to_date, category_id, channel, payment)


@router.get("/export")
def export_report(db: Session = Depends(get_db), user=Depends(require_active_user)):
    audit_service.write_log(db, user.company_id, user.email,
                            "Report Exported", "Analytics")
    data = analytics_service.get_analytics(db, user)
    return data   