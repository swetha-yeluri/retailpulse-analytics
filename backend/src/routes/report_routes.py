from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.services import report_service
from src.types.report_schema import (
    ReportResult, ReportHistoryOut, ScheduleCreate, ScheduleUpdate, ScheduleOut,
)
from src.utils.deps import require_active_user

router = APIRouter(prefix="/api/reports", tags=["Reports"])



@router.post("/generate", response_model=ReportResult)
def generate(payload: dict,
             db: Session = Depends(get_db),
             user=Depends(require_active_user)):
    report_type = payload.get("report_type")
    filters = payload.get("filters", {})
    fmt = payload.get("format", "table")
    return report_service.generate_report(db, user, report_type, filters, True, fmt)



@router.get("/history", response_model=list[ReportHistoryOut])
def history(db: Session = Depends(get_db),
            user=Depends(require_active_user)):
    return report_service.get_history(db, user)


# ---- SCHEDULED REPORTS (CRUD) ----
@router.post("/schedules", response_model=ScheduleOut)
def create_schedule(data: ScheduleCreate,
                    db: Session = Depends(get_db),
                    user=Depends(require_active_user)):
    return report_service.create_schedule(db, user, data)


@router.get("/schedules", response_model=list[ScheduleOut])
def list_schedules(db: Session = Depends(get_db),
                   user=Depends(require_active_user)):
    return report_service.list_schedules(db, user)


@router.put("/schedules/{schedule_id}", response_model=ScheduleOut)
def update_schedule(schedule_id: int, data: ScheduleUpdate,
                    db: Session = Depends(get_db),
                    user=Depends(require_active_user)):
    return report_service.update_schedule(db, user, schedule_id, data)


@router.delete("/schedules/{schedule_id}")
def delete_schedule(schedule_id: int,
                    db: Session = Depends(get_db),
                    user=Depends(require_active_user)):
    return report_service.delete_schedule(db, user, schedule_id)


@router.patch("/schedules/{schedule_id}/toggle", response_model=ScheduleOut)
def toggle_schedule(schedule_id: int,
                    db: Session = Depends(get_db),
                    user=Depends(require_active_user)):
    return report_service.toggle_schedule(db, user, schedule_id)


@router.post("/schedules/{schedule_id}/run", response_model=ScheduleOut)
def run_schedule(schedule_id: int,
                 db: Session = Depends(get_db),
                 user=Depends(require_active_user)):
    return report_service.run_schedule(db, user, schedule_id)