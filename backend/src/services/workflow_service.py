import json
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.models.workflow_model import ApprovalRequest, RequestHistory, WorkflowConfig
from src.models.product_model import Product
from src.models.customer_model import Customer
from src.services import audit_service


REQUEST_TYPES = [
    "Stock Adjustment", "Product Deactivation", "Product Price Change",
    "Customer Information Change", "Inventory Import Approval",
]


VALID_TRANSITIONS = {
    "Draft": ["Submitted", "Cancelled"],
    "Submitted": ["Pending Approval", "Cancelled"],
    "Pending Approval": ["Approved", "Rejected", "Cancelled"],
    "Approved": [],      
    "Rejected": [],      
    "Cancelled": [],     
}


def _log_history(db, request_id, company_id, action, user_email, comment=""):
    """Timeline history entry."""
    h = RequestHistory(
        request_id=request_id, company_id=company_id, action=action,
        performed_by=user_email, comment=comment,
    )
    db.add(h)


def create_request(db, user, data):
    """Create approval request (Pending Approval)."""
    if data.request_type not in REQUEST_TYPES:
        raise HTTPException(400, "Invalid request type")

    req = ApprovalRequest(
        company_id=user.company_id, request_type=data.request_type,
        requested_by=user.email, related_record=data.related_record,
        related_id=data.related_id,
        current_values=json.dumps(data.current_values or {}),
        requested_values=json.dumps(data.requested_values or {}),
        reason=data.reason, status="Pending Approval", priority=data.priority,
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    _log_history(db, req.id, user.company_id, "Created", user.email)
    _log_history(db, req.id, user.company_id, "Submitted for approval", user.email)
    db.commit()

    audit_service.write_log(db, user.company_id, user.email,
                            "Approval Request Created", f"Request #{req.id} - {data.request_type}")
    return _request_out(req)


def list_requests(db, user, status="", request_type="", my_requests=False, page=1, limit=25):
    """List requests (filters + pagination)."""
    query = db.query(ApprovalRequest).filter(ApprovalRequest.company_id == user.company_id)

    if my_requests:
        query = query.filter(ApprovalRequest.requested_by == user.email)  # own requests
    if status:
        query = query.filter(ApprovalRequest.status == status)
    if request_type:
        query = query.filter(ApprovalRequest.request_type == request_type)

    total = query.count()
    requests = (query.order_by(ApprovalRequest.created_at.desc())
                .offset((page - 1) * limit).limit(limit).all())

    return {"total": total, "page": page, "limit": limit,
            "requests": [_request_out(r) for r in requests]}


def get_detail(db, user, request_id):
    """Request detail + history (timeline)."""
    req = _get_own_request(db, user, request_id)

    history = (db.query(RequestHistory)
               .filter(RequestHistory.request_id == request_id)
               .order_by(RequestHistory.timestamp.asc()).all())

    out = _request_out(req, full=True)
    out["history"] = [{
        "action": h.action, "performed_by": h.performed_by,
        "comment": h.comment, "timestamp": str(h.timestamp),
    } for h in history]
    return out


def approve_request(db, user, request_id, data):
    """Approve - apply change + status update (transaction safe)."""
    req = _get_own_request(db, user, request_id)

    
    if req.status != "Pending Approval":
        raise HTTPException(400, f"Cannot approve a {req.status} request")

    
    if req.requested_by == user.email:
        raise HTTPException(403, "You cannot approve your own request")

    
    if user.role not in ("Super Admin", "Company Admin"):
        raise HTTPException(403, "Not authorized to approve")

    
    try:
        _apply_change(db, user.company_id, req)
    except Exception as e:
        raise HTTPException(500, f"Failed to apply change: {str(e)}")

    
    req.status = "Approved"
    req.reviewed_by = user.email
    req.review_comment = data.comment
    req.reviewed_at = datetime.utcnow()

    _log_history(db, req.id, user.company_id, "Approved", user.email, data.comment)
    _log_history(db, req.id, user.company_id, "Change applied", user.email)
    db.commit()
    db.refresh(req)

    audit_service.write_log(db, user.company_id, user.email,
                            "Request Approved", f"Request #{req.id}")
    return _request_out(req, full=True)


def reject_request(db, user, request_id, data):
    
    req = _get_own_request(db, user, request_id)

    if req.status != "Pending Approval":
        raise HTTPException(400, f"Cannot reject a {req.status} request")
    if req.requested_by == user.email:
        raise HTTPException(403, "You cannot reject your own request")
    if user.role not in ("Super Admin", "Company Admin"):
        raise HTTPException(403, "Not authorized to reject")
    if not data.comment:
        raise HTTPException(400, "Rejection reason is required")   # reject - reason mandatory

    req.status = "Rejected"
    req.reviewed_by = user.email
    req.review_comment = data.comment
    req.reviewed_at = datetime.utcnow()

    _log_history(db, req.id, user.company_id, "Rejected", user.email, data.comment)
    db.commit()
    db.refresh(req)

    audit_service.write_log(db, user.company_id, user.email,
                            "Request Rejected", f"Request #{req.id}")
    return _request_out(req, full=True)


def cancel_request(db, user, request_id):
    
    req = _get_own_request(db, user, request_id)

    if req.status not in ("Draft", "Submitted", "Pending Approval"):
        raise HTTPException(400, f"Cannot cancel a {req.status} request")
    if req.requested_by != user.email and user.role not in ("Super Admin", "Company Admin"):
        raise HTTPException(403, "Only the requester can cancel")

    req.status = "Cancelled"
    _log_history(db, req.id, user.company_id, "Cancelled", user.email)
    db.commit()
    db.refresh(req)

    audit_service.write_log(db, user.company_id, user.email,
                            "Request Cancelled", f"Request #{req.id}")
    return _request_out(req, full=True)


def _apply_change(db, company_id, req):
    
    requested = json.loads(req.requested_values or "{}")

    if req.request_type == "Stock Adjustment":
        product = db.query(Product).filter(
            Product.id == req.related_id, Product.company_id == company_id).first()
        if product and "stock_quantity" in requested:
            product.stock_quantity = int(requested["stock_quantity"])

    elif req.request_type == "Product Price Change":
        product = db.query(Product).filter(
            Product.id == req.related_id, Product.company_id == company_id).first()
        if product and "unit_price" in requested:
            product.unit_price = float(requested["unit_price"])

    elif req.request_type == "Product Deactivation":
        product = db.query(Product).filter(
            Product.id == req.related_id, Product.company_id == company_id).first()
        if product:
            product.status = "Inactive"

    elif req.request_type == "Customer Information Change":
        customer = db.query(Customer).filter(
            Customer.id == req.related_id, Customer.company_id == company_id).first()
        if customer:
            if "email" in requested: customer.email = requested["email"]
            if "phone" in requested: customer.phone = requested["phone"]
    


def get_pending_count(db, user):
    """Pending approval count (badge)."""
    count = (db.query(ApprovalRequest)
             .filter(ApprovalRequest.company_id == user.company_id,
                     ApprovalRequest.status == "Pending Approval").count())
    return {"pending_count": count}




def list_configs(db, user):
    configs = db.query(WorkflowConfig).filter(
        WorkflowConfig.company_id == user.company_id).all()
    return [_config_out(c) for c in configs]


def create_config(db, user, data):
    if user.role not in ("Super Admin", "Company Admin"):
        raise HTTPException(403, "Only admins can configure workflows")
    cfg = WorkflowConfig(
        company_id=user.company_id, request_type=data.request_type,
        approver_role=data.approver_role, approval_required=data.approval_required,
        is_active=data.is_active,
    )
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    audit_service.write_log(db, user.company_id, user.email,
                            "Workflow Config Changed", f"{data.request_type}")
    return _config_out(cfg)


def toggle_config(db, user, config_id):
    if user.role not in ("Super Admin", "Company Admin"):
        raise HTTPException(403, "Not authorized")
    cfg = db.query(WorkflowConfig).filter(
        WorkflowConfig.id == config_id,
        WorkflowConfig.company_id == user.company_id).first()
    if not cfg:
        raise HTTPException(404, "Config not found")
    cfg.is_active = not cfg.is_active
    db.commit()
    db.refresh(cfg)
    return _config_out(cfg)


def _get_own_request(db, user, request_id):
    req = db.query(ApprovalRequest).filter(
        ApprovalRequest.id == request_id,
        ApprovalRequest.company_id == user.company_id).first()
    if not req:
        raise HTTPException(404, "Request not found")
    return req


def _request_out(req, full=False):
    out = {
        "id": req.id, "request_type": req.request_type,
        "requested_by": req.requested_by, "related_record": req.related_record,
        "status": req.status, "priority": req.priority, "reason": req.reason,
        "created_at": str(req.created_at), "updated_at": str(req.updated_at),
    }
    if full:
        out.update({
            "current_values": req.current_values, "requested_values": req.requested_values,
            "reviewed_by": req.reviewed_by, "review_comment": req.review_comment,
            "reviewed_at": str(req.reviewed_at) if req.reviewed_at else None,
            "related_id": req.related_id, "history": [],
        })
    return out


def _config_out(c):
    return {
        "id": c.id, "request_type": c.request_type, "approver_role": c.approver_role,
        "approval_required": c.approval_required, "is_active": c.is_active,
    }