from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.models.monitoring_model import SystemError, Incident, IncidentHistory
from src.models.advanced_import_model import ImportJob
from src.models.data_quality_model import ReconciliationHistory
from src.models.report_model import ReportHistory
from src.services import audit_service



def check_health(db: Session):
    """Real health check - app + database."""
    components = []

    
    components.append({
        "component": "Application API", "status": "Healthy",
        "detail": "API is responding",
    })

    
    try:
        db.execute(text("SELECT 1"))
        components.append({
            "component": "Database", "status": "Healthy",
            "detail": "Database connection active",
        })
        db_healthy = True
    except Exception:
        components.append({
            "component": "Database", "status": "Unavailable",
            "detail": "Database connection failed",
        })
        db_healthy = False

    
    recent_cutoff = datetime.utcnow() - timedelta(hours=24)
    failed_jobs = (db.query(ImportJob)
                   .filter(ImportJob.status == "Failed",
                           ImportJob.created_at >= recent_cutoff).count())
    if failed_jobs == 0:
        job_status = "Healthy"
    elif failed_jobs < 3:
        job_status = "Degraded"
    else:
        job_status = "Unavailable"
    components.append({
        "component": "Background Jobs", "status": job_status,
        "detail": f"{failed_jobs} failed jobs in last 24h",
    })

    
    statuses = [c["status"] for c in components]
    if "Unavailable" in statuses:
        overall = "Unavailable"
    elif "Degraded" in statuses:
        overall = "Degraded"
    else:
        overall = "Healthy"

    return {
        "overall_status": overall,
        "components": components,
        "last_checked": str(datetime.utcnow()),
    }




def get_dashboard(db: Session, user):
    company_id = user.company_id
    health = check_health(db)

    
    jobs = _collect_jobs(db, company_id)
    completed = sum(1 for j in jobs if j["status"] in ("Completed", "Completed with Errors"))
    failed = sum(1 for j in jobs if j["status"] == "Failed")
    active = sum(1 for j in jobs if j["status"] in ("Pending", "Running", "Processing", "Uploaded"))

    
    durations = [j["duration"] for j in jobs if j["duration"] > 0]
    avg_response = round(sum(durations) / len(durations) * 1000, 2) if durations else 0

    
    recent_errors = (db.query(SystemError)
                     .filter(SystemError.status.in_(["Open", "Investigating"])).count())

    return {
        "overall_status": health["overall_status"],
        "api_available": health["overall_status"] != "Unavailable",
        "avg_response_time": avg_response,
        "failed_api_requests": failed,
        "jobs_completed": completed,
        "jobs_failed": failed,
        "active_pending_jobs": active,
        "recent_errors": recent_errors,
        "last_health_check": health["last_checked"],
    }




def _collect_jobs(db, company_id):
    """Collect jobs from import, reconciliation, reports."""
    jobs = []

    
    imports = (db.query(ImportJob)
               .filter(ImportJob.company_id == company_id)
               .order_by(ImportJob.created_at.desc()).limit(30).all())
    for j in imports:
        jobs.append({
            "job_id": f"import-{j.id}", "job_type": "Data Import",
            "triggered_by": j.uploaded_by,
            "started_at": str(j.started_at) if j.started_at else None,
            "completed_at": str(j.completed_at) if j.completed_at else None,
            "duration": j.processing_duration or 0, "status": j.status,
            "retry_count": 0, "failure_reason": None,
        })

    
    recons = (db.query(ReconciliationHistory)
              .filter(ReconciliationHistory.company_id == company_id)
              .order_by(ReconciliationHistory.started_at.desc()).limit(20).all())
    for r in recons:
        dur = 0
        if r.completed_at and r.started_at:
            dur = round((r.completed_at - r.started_at).total_seconds(), 2)
        jobs.append({
            "job_id": f"reconcile-{r.id}", "job_type": "Reconciliation",
            "triggered_by": r.triggered_by,
            "started_at": str(r.started_at), "completed_at": str(r.completed_at) if r.completed_at else None,
            "duration": dur, "status": r.status,
            "retry_count": 0, "failure_reason": None,
        })

    
    reports = (db.query(ReportHistory)
               .filter(ReportHistory.company_id == company_id)
               .order_by(ReportHistory.created_at.desc()).limit(20).all())
    for rp in reports:
        jobs.append({
            "job_id": f"report-{rp.id}", "job_type": "Report Generation",
            "triggered_by": rp.generated_by,
            "started_at": str(rp.created_at), "completed_at": str(rp.created_at),
            "duration": 0, "status": rp.status,
            "retry_count": 0, "failure_reason": None,
        })

    jobs.sort(key=lambda j: j["started_at"] or "", reverse=True)
    return jobs


def list_jobs(db, user, status="", job_type=""):
    jobs = _collect_jobs(db, user.company_id)
    if status:
        jobs = [j for j in jobs if j["status"] == status]
    if job_type:
        jobs = [j for j in jobs if j["job_type"] == job_type]
    return jobs




def log_error(db, company_id, category, component, message, severity="Medium", source=""):
    """Error log - grouping (duplicate avoid)."""
    error_key = f"{category}_{component}_{message[:50]}"
    existing = db.query(SystemError).filter(
        SystemError.error_key == error_key,
        SystemError.status.in_(["Open", "Investigating"])).first()

    if existing:
        existing.occurrence_count += 1  
        existing.last_seen = datetime.utcnow()
    else:
        err = SystemError(
            company_id=company_id, error_category=category,
            affected_component=component, source=source, severity=severity,
            message=message[:500], error_key=error_key,
        )
        db.add(err)
    db.commit()


def list_errors(db, user, severity="", component="", status="", search=""):
    query = db.query(SystemError)
    
    if severity:
        query = query.filter(SystemError.severity == severity)
    if status:
        query = query.filter(SystemError.status == status)
    if search:
        query = query.filter(SystemError.message.ilike(f"%{search}%"))
    errors = query.order_by(SystemError.last_seen.desc()).limit(100).all()
    return [{
        "id": e.id, "error_category": e.error_category,
        "affected_component": e.affected_component, "source": e.source,
        "severity": e.severity, "message": e.message,
        "occurrence_count": e.occurrence_count, "status": e.status,
        "first_seen": str(e.first_seen), "last_seen": str(e.last_seen),
    } for e in errors]


def resolve_error(db, user, error_id, status):
    if user.role not in ("Super Admin", "Company Admin"):
        raise HTTPException(403, "Not authorized")
    e = db.query(SystemError).filter(SystemError.id == error_id).first()
    if not e:
        raise HTTPException(404, "Error not found")
    e.status = status
    db.commit()
    audit_service.write_log(db, user.company_id, user.email,
                            "Error Status Updated", f"Error #{error_id} -> {status}")
    return {"updated": True}




def create_incident(db, user, data):
    if user.role not in ("Super Admin", "Company Admin"):
        raise HTTPException(403, "Not authorized")
    inc = Incident(
        company_id=user.company_id, title=data.title,
        affected_component=data.affected_component, severity=data.severity,
        description=data.description, status="Open", created_by=user.email,
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)
    _log_incident_history(db, inc.id, "Created", user.email)
    db.commit()
    audit_service.write_log(db, user.company_id, user.email,
                            "Incident Created", f"Incident #{inc.id}")
    return _incident_out(inc)


def list_incidents(db, user, status=""):
    query = db.query(Incident).filter(Incident.company_id == user.company_id)
    if status:
        query = query.filter(Incident.status == status)
    incidents = query.order_by(Incident.created_at.desc()).all()
    return [_incident_out(i) for i in incidents]


def get_incident(db, user, incident_id):
    inc = _get_own_incident(db, user, incident_id)
    history = (db.query(IncidentHistory)
               .filter(IncidentHistory.incident_id == incident_id)
               .order_by(IncidentHistory.timestamp.asc()).all())
    out = _incident_out(inc)
    out["history"] = [{
        "action": h.action, "performed_by": h.performed_by,
        "note": h.note, "timestamp": str(h.timestamp),
    } for h in history]
    return out


def update_incident(db, user, incident_id, data):
    if user.role not in ("Super Admin", "Company Admin"):
        raise HTTPException(403, "Not authorized")
    inc = _get_own_incident(db, user, incident_id)

    inc.status = data.status
    if data.note:
        inc.investigation_notes = (inc.investigation_notes or "") + f"\n{data.note}"
    if data.status == "Resolved":
        inc.resolved_by = user.email
        inc.resolved_at = datetime.utcnow()
        inc.resolution = data.resolution or data.note

    _log_incident_history(db, inc.id, data.status, user.email, data.note)
    db.commit()
    db.refresh(inc)
    audit_service.write_log(db, user.company_id, user.email,
                            "Incident Updated", f"Incident #{inc.id} -> {data.status}")
    return get_incident(db, user, incident_id)


def _log_incident_history(db, incident_id, action, user_email, note=""):
    db.add(IncidentHistory(
        incident_id=incident_id, action=action, performed_by=user_email, note=note))


def _get_own_incident(db, user, incident_id):
    inc = db.query(Incident).filter(
        Incident.id == incident_id, Incident.company_id == user.company_id).first()
    if not inc:
        raise HTTPException(404, "Incident not found")
    return inc


def _incident_out(inc):
    return {
        "id": inc.id, "title": inc.title, "affected_component": inc.affected_component,
        "severity": inc.severity, "status": inc.status, "description": inc.description,
        "investigation_notes": inc.investigation_notes, "resolution": inc.resolution,
        "created_by": inc.created_by, "resolved_by": inc.resolved_by,
        "created_at": str(inc.created_at), "history": [],
    }