from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.models.governance_model import AccessRequest, AccessReview, PermissionHistory
from src.models.user_model import User
from src.services import audit_service


ROLES = ["Super Admin", "Company Admin", "Analyst", "Viewer"]

MODULES = [
    "Dashboard & Analytics", "Products", "Inventory", "Sales", "Customers",
    "Reports", "Data Imports", "Workflows", "Audit Logs", "System Monitoring",
    "Data Governance",
]


PERMISSION_MATRIX = {
    "Dashboard & Analytics": {"Super Admin": "Full", "Company Admin": "Full", "Analyst": "View", "Viewer": "View"},
    "Products":        {"Super Admin": "Full", "Company Admin": "Full", "Analyst": "View", "Viewer": "View"},
    "Inventory":       {"Super Admin": "Full", "Company Admin": "Full", "Analyst": "View", "Viewer": "View"},
    "Sales":           {"Super Admin": "Full", "Company Admin": "Full", "Analyst": "Create/View", "Viewer": "View"},
    "Customers":       {"Super Admin": "Full", "Company Admin": "Full", "Analyst": "View", "Viewer": "View"},
    "Reports":         {"Super Admin": "Full", "Company Admin": "Full", "Analyst": "Generate/Export", "Viewer": "View"},
    "Data Imports":    {"Super Admin": "Full", "Company Admin": "Full", "Analyst": "No Access", "Viewer": "No Access"},
    "Workflows":       {"Super Admin": "Manage", "Company Admin": "Manage", "Analyst": "Create", "Viewer": "No Access"},
    "Audit Logs":      {"Super Admin": "View", "Company Admin": "View", "Analyst": "No Access", "Viewer": "No Access"},
    "System Monitoring": {"Super Admin": "Full", "Company Admin": "Full", "Analyst": "View", "Viewer": "No Access"},
    "Data Governance": {"Super Admin": "Manage", "Company Admin": "Manage", "Analyst": "No Access", "Viewer": "No Access"},
}


def get_matrix():
    rows = []
    for module in MODULES:
        rows.append({"module": module, "permissions": PERMISSION_MATRIX.get(module, {})})
    return {"roles": ROLES, "rows": rows}




def get_dashboard(db: Session, user):
    company_id = user.company_id
    users = db.query(User).filter(User.company_id == company_id).all()

    active = sum(1 for u in users if u.status == "Active")
    inactive = sum(1 for u in users if u.status != "Active")
    elevated = sum(1 for u in users if u.role in ("Super Admin", "Company Admin"))

    pending = (db.query(AccessRequest)
               .filter(AccessRequest.company_id == company_id,
                       AccessRequest.status == "Pending").count())

    recent_changes = (db.query(PermissionHistory)
                      .filter(PermissionHistory.company_id == company_id).count())

    last_review = (db.query(AccessReview)
                   .filter(AccessReview.company_id == company_id)
                   .order_by(AccessReview.reviewed_at.desc()).first())

    return {
        "total_users": len(users),
        "active_users": active,
        "inactive_users": inactive,
        "total_roles": len(ROLES),
        "pending_access_requests": pending,
        "elevated_permission_users": elevated,
        "recent_permission_changes": recent_changes,
        "last_review_date": str(last_review.reviewed_at) if last_review and last_review.reviewed_at else None,
    }




def list_users(db: Session, user):
    users = db.query(User).filter(User.company_id == user.company_id).all()
    return [{
        "id": u.id, "name": getattr(u, "name", u.email), "email": u.email,
        "role": u.role, "status": u.status,
        "last_updated": str(getattr(u, "updated_at", None)) if getattr(u, "updated_at", None) else None,
    } for u in users]


def update_user_role(db: Session, user, user_id, data):
    """Role update - security checks."""
    
    if user.role not in ("Super Admin", "Company Admin"):
        raise HTTPException(403, "Only admins can change roles")

    
    if data.new_role not in ROLES:
        raise HTTPException(400, "Invalid role")

    target = db.query(User).filter(
        User.id == user_id, User.company_id == user.company_id).first()
    if not target:
        raise HTTPException(404, "User not found")

    
    if target.email == user.email:
        raise HTTPException(403, "You cannot change your own role")

    
    if target.role in ("Super Admin", "Company Admin") and data.new_role not in ("Super Admin", "Company Admin"):
        admin_count = db.query(User).filter(
            User.company_id == user.company_id,
            User.role.in_(["Super Admin", "Company Admin"]),
            User.status == "Active").count()
        if admin_count <= 1:
            raise HTTPException(400, "Cannot remove the last administrator")

    old_role = target.role
    target.role = data.new_role

    
    db.add(PermissionHistory(
        company_id=user.company_id, target_user=target.email,
        previous_role=old_role, new_role=data.new_role,
        changed_by=user.email, reason=data.reason,
    ))
    db.commit()

    audit_service.write_log(db, user.company_id, user.email,
                            "Role Changed", f"{target.email}: {old_role} -> {data.new_role}")
    return {"updated": True, "email": target.email, "new_role": data.new_role}


def toggle_user_status(db: Session, user, user_id):
    if user.role not in ("Super Admin", "Company Admin"):
        raise HTTPException(403, "Not authorized")
    target = db.query(User).filter(
        User.id == user_id, User.company_id == user.company_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    if target.email == user.email:
        raise HTTPException(403, "You cannot change your own status")

    target.status = "Inactive" if target.status == "Active" else "Active"
    db.commit()
    audit_service.write_log(db, user.company_id, user.email,
                            "User Status Changed", f"{target.email} -> {target.status}")
    return {"updated": True, "status": target.status}




def create_request(db: Session, user, data):
    if data.requested_role not in ROLES:
        raise HTTPException(400, "Invalid role")

    req = AccessRequest(
        company_id=user.company_id, requested_by=user.email,
        current_role=user.role, requested_role=data.requested_role,
        reason=data.reason, status="Pending",
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    audit_service.write_log(db, user.company_id, user.email,
                            "Access Request Created", f"Request #{req.id} - {data.requested_role}")
    return _request_out(req)


def list_requests(db: Session, user, status="", my_requests=False):
    query = db.query(AccessRequest).filter(AccessRequest.company_id == user.company_id)
    if my_requests:
        query = query.filter(AccessRequest.requested_by == user.email)
    if status:
        query = query.filter(AccessRequest.status == status)
    reqs = query.order_by(AccessRequest.created_at.desc()).all()
    return [_request_out(r) for r in reqs]


def approve_request(db: Session, user, request_id, data):
    """Approve - APPLY role change."""
    if user.role not in ("Super Admin", "Company Admin"):
        raise HTTPException(403, "Not authorized to approve")

    req = _get_own_request(db, user, request_id)
    if req.status != "Pending":
        raise HTTPException(400, f"Cannot approve a {req.status} request")
    if req.requested_by == user.email:
        raise HTTPException(403, "You cannot approve your own request")

    
    target = db.query(User).filter(
        User.email == req.requested_by, User.company_id == user.company_id).first()
    if target:
        old_role = target.role
        target.role = req.requested_role
        db.add(PermissionHistory(
            company_id=user.company_id, target_user=target.email,
            previous_role=old_role, new_role=req.requested_role,
            changed_by=user.email, reason="Access request approved",
            related_request_id=req.id,
        ))

    req.status = "Approved"
    req.reviewed_by = user.email
    req.review_comment = data.comment
    req.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(req)

    audit_service.write_log(db, user.company_id, user.email,
                            "Access Request Approved", f"Request #{req.id} - {req.requested_by} -> {req.requested_role}")
    return _request_out(req)


def reject_request(db: Session, user, request_id, data):
    if user.role not in ("Super Admin", "Company Admin"):
        raise HTTPException(403, "Not authorized")
    req = _get_own_request(db, user, request_id)
    if req.status != "Pending":
        raise HTTPException(400, f"Cannot reject a {req.status} request")
    if not data.comment:
        raise HTTPException(400, "Rejection reason is required")

    req.status = "Rejected"
    req.reviewed_by = user.email
    req.review_comment = data.comment
    req.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(req)
    audit_service.write_log(db, user.company_id, user.email,
                            "Access Request Rejected", f"Request #{req.id}")
    return _request_out(req)


def cancel_request(db: Session, user, request_id):
    req = _get_own_request(db, user, request_id)
    if req.requested_by != user.email:
        raise HTTPException(403, "Only the requester can cancel")
    if req.status != "Pending":
        raise HTTPException(400, f"Cannot cancel a {req.status} request")
    req.status = "Cancelled"
    db.commit()
    db.refresh(req)
    return _request_out(req)




def create_review(db: Session, user, data):
    if user.role not in ("Super Admin", "Company Admin"):
        raise HTTPException(403, "Not authorized")
    target = db.query(User).filter(
        User.email == data.user_email, User.company_id == user.company_id).first()

    rev = AccessReview(
        company_id=user.company_id, user_email=data.user_email,
        user_role=target.role if target else None,
        review_status=data.review_status, review_comment=data.review_comment,
        reviewed_by=user.email, reviewed_at=datetime.utcnow(),
    )
    db.add(rev)
    db.commit()
    db.refresh(rev)
    audit_service.write_log(db, user.company_id, user.email,
                            "Access Reviewed", f"{data.user_email} - {data.review_status}")
    return _review_out(rev)


def list_reviews(db: Session, user):
    reviews = (db.query(AccessReview)
               .filter(AccessReview.company_id == user.company_id)
               .order_by(AccessReview.created_at.desc()).all())
    return [_review_out(r) for r in reviews]




def get_history(db: Session, user):
    records = (db.query(PermissionHistory)
               .filter(PermissionHistory.company_id == user.company_id)
               .order_by(PermissionHistory.timestamp.desc()).limit(100).all())
    return [{
        "id": h.id, "target_user": h.target_user,
        "previous_role": h.previous_role, "new_role": h.new_role,
        "changed_by": h.changed_by, "reason": h.reason,
        "timestamp": str(h.timestamp),
    } for h in records]



def _get_own_request(db, user, request_id):
    req = db.query(AccessRequest).filter(
        AccessRequest.id == request_id,
        AccessRequest.company_id == user.company_id).first()
    if not req:
        raise HTTPException(404, "Request not found")
    return req


def _request_out(r):
    return {
        "id": r.id, "requested_by": r.requested_by, "current_role": r.current_role,
        "requested_role": r.requested_role, "reason": r.reason, "status": r.status,
        "reviewed_by": r.reviewed_by, "review_comment": r.review_comment,
        "created_at": str(r.created_at),
    }


def _review_out(r):
    return {
        "id": r.id, "user_email": r.user_email, "user_role": r.user_role,
        "review_status": r.review_status, "review_comment": r.review_comment,
        "reviewed_by": r.reviewed_by,
        "reviewed_at": str(r.reviewed_at) if r.reviewed_at else None,
        "created_at": str(r.created_at),
    }