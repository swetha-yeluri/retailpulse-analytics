from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.services import monitoring_service
from src.types.monitoring_schema import (
    HealthResponse, HealthDashboard, JobOut, ErrorOut,
    IncidentCreate, IncidentUpdate, IncidentOut, IncidentDetail,
)
from src.utils.deps import require_active_user

router = APIRouter(prefix="/api/monitoring", tags=["System Health"])



@router.get("/health", response_model=HealthResponse)
def health(db: Session = Depends(get_db)):
    return monitoring_service.check_health(db)



@router.get("/dashboard", response_model=HealthDashboard)
def dashboard(db: Session = Depends(get_db), user=Depends(require_active_user)):
    return monitoring_service.get_dashboard(db, user)



@router.get("/jobs", response_model=list[JobOut])
def list_jobs(status: str = "", job_type: str = "",
              db: Session = Depends(get_db), user=Depends(require_active_user)):
    return monitoring_service.list_jobs(db, user, status, job_type)



@router.get("/errors", response_model=list[ErrorOut])
def list_errors(severity: str = "", component: str = "", status: str = "", search: str = "",
                db: Session = Depends(get_db), user=Depends(require_active_user)):
    return monitoring_service.list_errors(db, user, severity, component, status, search)


@router.put("/errors/{error_id}/status")
def update_error(error_id: int, status: str,
                 db: Session = Depends(get_db), user=Depends(require_active_user)):
    return monitoring_service.resolve_error(db, user, error_id, status)



@router.post("/incidents", response_model=IncidentOut)
def create_incident(data: IncidentCreate,
                    db: Session = Depends(get_db), user=Depends(require_active_user)):
    return monitoring_service.create_incident(db, user, data)


@router.get("/incidents", response_model=list[IncidentOut])
def list_incidents(status: str = "",
                   db: Session = Depends(get_db), user=Depends(require_active_user)):
    return monitoring_service.list_incidents(db, user, status)


@router.get("/incidents/{incident_id}", response_model=IncidentDetail)
def get_incident(incident_id: int,
                 db: Session = Depends(get_db), user=Depends(require_active_user)):
    return monitoring_service.get_incident(db, user, incident_id)


@router.put("/incidents/{incident_id}", response_model=IncidentDetail)
def update_incident(incident_id: int, data: IncidentUpdate,
                    db: Session = Depends(get_db), user=Depends(require_active_user)):
    return monitoring_service.update_incident(db, user, incident_id, data)