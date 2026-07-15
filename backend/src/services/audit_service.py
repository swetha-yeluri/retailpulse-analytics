
from sqlalchemy.orm import Session

from src.models.audit_model import AuditLog


def write_log(db: Session, company_id, user_email, action, ip="", browser=""):
    log = AuditLog(
        company_id=company_id, user_email=user_email, action=action,
        ip_address=ip, browser=browser,
    )
    db.add(log)
    db.commit()


def list_logs(db: Session, admin):
    
    return (db.query(AuditLog)
            .filter(AuditLog.company_id == admin.company_id)
            .order_by(AuditLog.created_at.desc())
            .all())