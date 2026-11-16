from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional

from src.config.database import get_db
from src.utils.deps import require_active_user, require_admin
from src.services import integration_service
from src.types.integration_schema import (
    IntegrationDashboard, IntegrationCreate, IntegrationUpdate, IntegrationOut,
    ConnectionTestResult, MappingSave, MappingOut, SyncTrigger, SyncHistoryOut,
    FailedRecordOut, ScheduleCreate, ScheduleOut,
)

router = APIRouter(prefix="/api/integrations", tags=["Data Integration"])



@router.get("/dashboard", response_model=IntegrationDashboard)
def dashboard(db: Session = Depends(get_db), user=Depends(require_active_user)):
    return integration_service.get_dashboard(db, user.company_id)



@router.get("/target-fields/{module}")
def target_fields(module: str, user=Depends(require_active_user)):
    return integration_service.get_target_fields(module)



@router.get("", response_model=list[IntegrationOut])
def list_integrations(db: Session = Depends(get_db), user=Depends(require_active_user)):
    return integration_service.list_integrations(db, user.company_id)


@router.get("/{integ_id}", response_model=IntegrationOut)
def get_integration(integ_id: int, db: Session = Depends(get_db), user=Depends(require_active_user)):
    return integration_service.get_integration(db, user.company_id, integ_id)


@router.post("", response_model=IntegrationOut)
def create_integration(data: IntegrationCreate, db: Session = Depends(get_db), user=Depends(require_admin)):
    return integration_service.create_integration(db, user.company_id, user.email, data)


@router.put("/{integ_id}", response_model=IntegrationOut)
def update_integration(integ_id: int, data: IntegrationUpdate, db: Session = Depends(get_db), user=Depends(require_admin)):
    return integration_service.update_integration(db, user.company_id, user.email, integ_id, data)


@router.patch("/{integ_id}/toggle", response_model=IntegrationOut)
def toggle_integration(integ_id: int, db: Session = Depends(get_db), user=Depends(require_admin)):
    return integration_service.toggle_integration(db, user.company_id, user.email, integ_id)


@router.delete("/{integ_id}")
def delete_integration(integ_id: int, db: Session = Depends(get_db), user=Depends(require_admin)):
    return integration_service.delete_integration(db, user.company_id, user.email, integ_id)



@router.post("/{integ_id}/test", response_model=ConnectionTestResult)
def test_connection(integ_id: int, db: Session = Depends(get_db), user=Depends(require_admin)):
    return integration_service.test_connection(db, user.company_id, user.email, integ_id)



@router.get("/{integ_id}/mappings", response_model=list[MappingOut])
def get_mappings(integ_id: int, db: Session = Depends(get_db), user=Depends(require_active_user)):
    return integration_service.list_mappings(db, user.company_id, integ_id)


@router.post("/{integ_id}/mappings", response_model=list[MappingOut])
def save_mappings(integ_id: int, data: MappingSave, db: Session = Depends(get_db), user=Depends(require_admin)):
    return integration_service.save_mappings(db, user.company_id, integ_id, data.mappings)



@router.post("/{integ_id}/sync", response_model=SyncHistoryOut)
def run_sync(integ_id: int, data: SyncTrigger, db: Session = Depends(get_db), user=Depends(require_admin)):
    return integration_service.run_sync(db, user.company_id, user.email, integ_id, data)



@router.get("/history/all", response_model=list[SyncHistoryOut])
def list_history(integ_id: Optional[int] = None, db: Session = Depends(get_db), user=Depends(require_active_user)):
    return integration_service.list_history(db, user.company_id, integ_id)


@router.get("/history/{sync_id}", response_model=SyncHistoryOut)
def history_detail(sync_id: int, db: Session = Depends(get_db), user=Depends(require_active_user)):
    return integration_service.get_history_detail(db, user.company_id, sync_id)



@router.get("/history/{sync_id}/failed", response_model=list[FailedRecordOut])
def list_failed(sync_id: int, db: Session = Depends(get_db), user=Depends(require_active_user)):
    return integration_service.list_failed(db, user.company_id, sync_id)


@router.post("/history/{sync_id}/retry")
def retry_failed(sync_id: int, db: Session = Depends(get_db), user=Depends(require_admin)):
    return integration_service.retry_failed(db, user.company_id, user.email, sync_id)



@router.get("/schedules/all", response_model=list[ScheduleOut])
def list_schedules(db: Session = Depends(get_db), user=Depends(require_active_user)):
    return integration_service.list_schedules(db, user.company_id)


@router.post("/schedules", response_model=ScheduleOut)
def create_schedule(data: ScheduleCreate, db: Session = Depends(get_db), user=Depends(require_admin)):
    return integration_service.create_schedule(db, user.company_id, data)


@router.patch("/schedules/{sched_id}/toggle", response_model=ScheduleOut)
def toggle_schedule(sched_id: int, db: Session = Depends(get_db), user=Depends(require_admin)):
    return integration_service.toggle_schedule(db, user.company_id, sched_id)


@router.delete("/schedules/{sched_id}")
def delete_schedule(sched_id: int, db: Session = Depends(get_db), user=Depends(require_admin)):
    return integration_service.delete_schedule(db, user.company_id, sched_id)