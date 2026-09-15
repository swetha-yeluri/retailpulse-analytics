import json

from sqlalchemy import or_
from sqlalchemy.orm import Session

from src.models.audit_model import AuditLog


def write_log(db: Session, company_id, user_email, action, target_name="",
              ip="", browser="", resource_type=None, resource_id=None,
              description=None, status="Success", before=None, after=None):
    
    log = AuditLog(
        company_id=company_id, user_email=user_email, action=action,
        target_name=target_name, ip_address=ip, browser=browser,
        resource_type=resource_type, resource_id=str(resource_id) if resource_id else None,
        description=description, status=status,
        before_values=json.dumps(before) if before else None,
        after_values=json.dumps(after) if after else None,
    )
    db.add(log)
    db.commit()


def list_logs(db: Session, admin, user="", action="", resource_type="",
              status="", search="", date_from=None, date_to=None,
              sort="newest", page=1, limit=25):

    query = db.query(AuditLog).filter(AuditLog.company_id == admin.company_id)

    
    if user:
        query = query.filter(AuditLog.user_email == user)
    if action:
        query = query.filter(AuditLog.action == action)
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if status:
        query = query.filter(AuditLog.status == status)
    if date_from:
        query = query.filter(AuditLog.created_at >= date_from)
    if date_to:
        query = query.filter(AuditLog.created_at <= date_to)

    
    if search:
        like = f"%{search}%"
        query = query.filter(or_(
            AuditLog.user_email.ilike(like),
            AuditLog.action.ilike(like),
            AuditLog.target_name.ilike(like),
            AuditLog.resource_type.ilike(like),
            AuditLog.description.ilike(like),
        ))

    
    total = query.count()


    if sort == "oldest":
        query = query.order_by(AuditLog.created_at.asc())
    else:
        query = query.order_by(AuditLog.created_at.desc())   

    
    offset = (page - 1) * limit
    logs = query.offset(offset).limit(limit).all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "logs": logs,
    }


def get_log(db: Session, admin, log_id):
    
    log = db.query(AuditLog).filter(
        AuditLog.id == log_id,
        AuditLog.company_id == admin.company_id).first()
    if not log:
        from fastapi import HTTPException
        raise HTTPException(404, "Audit log not found")
    return log


def get_filter_options(db: Session, admin):

    logs = db.query(AuditLog).filter(AuditLog.company_id == admin.company_id).all()
    users = sorted(set(l.user_email for l in logs if l.user_email))
    actions = sorted(set(l.action for l in logs if l.action))
    resources = sorted(set(l.resource_type for l in logs if l.resource_type))
    return {"users": users, "actions": actions, "resources": resources}