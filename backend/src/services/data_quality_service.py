import json
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.models.data_quality_model import QualityIssue, ReconciliationHistory
from src.models.sale_model import Sale
from src.models.sale_item_model import SaleItem
from src.models.product_model import Product
from src.models.customer_model import Customer
from src.services import audit_service


def _add_issue(db, company_id, issue_type, severity, module, record,
               description, details, issue_key, existing_keys):
    
    if issue_key in existing_keys:
        return False   

    issue = QualityIssue(
        company_id=company_id, issue_type=issue_type, severity=severity,
        affected_module=module, affected_record=record,
        description=description, details=json.dumps(details) if details else None,
        status="Open", issue_key=issue_key,
    )
    db.add(issue)
    existing_keys.add(issue_key)
    return True




def run_reconciliation(db, user):
    company_id = user.company_id
    started = datetime.utcnow()


    existing = db.query(QualityIssue).filter(
        QualityIssue.company_id == company_id,
        QualityIssue.status.in_(["Open", "Investigating"])).all()
    existing_keys = set(i.issue_key for i in existing if i.issue_key)

    records_checked = 0
    detected = 0
    failed = 0

    products = db.query(Product).filter(Product.company_id == company_id).all()
    customers = db.query(Customer).filter(Customer.company_id == company_id).all()
    sales = db.query(Sale).filter(Sale.company_id == company_id).all()
    items = (db.query(SaleItem).join(Sale, Sale.id == SaleItem.sale_id)
             .filter(Sale.company_id == company_id).all())

    product_ids = {p.id for p in products}
    active_product_ids = {p.id for p in products if p.status == "Active"}
    customer_ids = {c.id for c in customers}

    
    for it in items:
        records_checked += 1
        product = next((p for p in products if p.id == it.product_id), None)
        if product and it.quantity > product.stock_quantity + it.quantity:
            
            pass 

    
    for it in items:
        if it.product_id not in product_ids:
            key = f"invalid_product_{it.id}"
            if _add_issue(db, company_id, "Invalid Product Reference", "Error",
                          "Sales", f"SaleItem #{it.id}",
                          f"Sale item references non-existent product #{it.product_id}",
                          {"product_id": it.product_id, "sale_item": it.id},
                          key, existing_keys):
                detected += 1

    
    for it in items:
        if it.product_id in product_ids and it.product_id not in active_product_ids:
            key = f"inactive_product_{it.id}"
            if _add_issue(db, company_id, "Inactive Product in Sale", "Warning",
                          "Sales", f"SaleItem #{it.id}",
                          f"Sale references inactive product #{it.product_id}",
                          {"product_id": it.product_id}, key, existing_keys):
                detected += 1

    
    for s in sales:
        records_checked += 1
        if s.customer_id and s.customer_id not in customer_ids:
            key = f"invalid_customer_{s.id}"
            if _add_issue(db, company_id, "Invalid Customer Reference", "Error",
                          "Sales", s.invoice_number,
                          f"Sale {s.invoice_number} references non-existent customer #{s.customer_id}",
                          {"customer_id": s.customer_id, "invoice": s.invoice_number},
                          key, existing_keys):
                detected += 1

    
    sku_map = {}
    for p in products:
        records_checked += 1
        if p.sku:
            sku_map.setdefault(p.sku, []).append(p.id)
    for sku, ids in sku_map.items():
        if len(ids) > 1:
            key = f"duplicate_sku_{sku}"
            if _add_issue(db, company_id, "Duplicate SKU", "Error",
                          "Product", sku,
                          f"SKU '{sku}' used by {len(ids)} products: {ids}",
                          {"sku": sku, "product_ids": ids}, key, existing_keys):
                detected += 1

    
    for p in products:
        if not p.name or not p.sku:
            key = f"missing_product_info_{p.id}"
            if _add_issue(db, company_id, "Missing Product Information", "Warning",
                          "Product", f"Product #{p.id}",
                          f"Product #{p.id} missing name or SKU",
                          {"product_id": p.id, "name": p.name, "sku": p.sku},
                          key, existing_keys):
                detected += 1


    for c in customers:
        records_checked += 1
        if not c.email or not c.phone or not c.first_name:
            key = f"missing_customer_info_{c.id}"
            if _add_issue(db, company_id, "Missing Customer Information", "Warning",
                          "Customer", c.customer_code,
                          f"Customer {c.customer_code} missing email/phone/name",
                          {"customer_id": c.id, "email": c.email, "phone": c.phone},
                          key, existing_keys):
                detected += 1

    
    for p in products:
        if p.stock_quantity < 0:
            key = f"negative_stock_{p.id}"
            if _add_issue(db, company_id, "Negative Stock", "Error",
                          "Inventory", p.name,
                          f"Product '{p.name}' has negative stock: {p.stock_quantity}",
                          {"product_id": p.id, "stock": p.stock_quantity},
                          key, existing_keys):
                detected += 1

    db.commit()

    
    if detected > 0:
        status = "Completed with Issues"
    else:
        status = "Completed"

    
    history = ReconciliationHistory(
        company_id=company_id, triggered_by=user.email,
        records_checked=records_checked, issues_detected=detected,
        issues_resolved=0, failed_checks=failed, status=status,
        started_at=started, completed_at=datetime.utcnow(),
    )
    db.add(history)
    db.commit()
    db.refresh(history)

    audit_service.write_log(db, company_id, user.email,
                            "Reconciliation Run", f"{detected} issues detected")

    return {
        "execution_id": history.id,
        "records_checked": records_checked,
        "issues_detected": detected,
        "issues_resolved": 0,
        "failed_checks": failed,
        "status": status,
    }




def get_dashboard(db, user):
    company_id = user.company_id

    issues = db.query(QualityIssue).filter(QualityIssue.company_id == company_id).all()
    errors = sum(1 for i in issues if i.severity == "Error")
    warnings = sum(1 for i in issues if i.severity == "Warning")
    unresolved = sum(1 for i in issues if i.status in ("Open", "Investigating"))

    last = (db.query(ReconciliationHistory)
            .filter(ReconciliationHistory.company_id == company_id)
            .order_by(ReconciliationHistory.started_at.desc()).first())

    total_checked = last.records_checked if last else 0
    valid = total_checked - len(issues) if total_checked > len(issues) else 0

    return {
        "total_records_checked": total_checked,
        "valid_records": valid,
        "warnings": warnings,
        "errors": errors,
        "unresolved_issues": unresolved,
        "last_reconciliation": str(last.started_at) if last else None,
    }




def list_issues(db, user, issue_type="", severity="", module="",
                status="", search="", date_from=None, date_to=None):
    query = db.query(QualityIssue).filter(QualityIssue.company_id == user.company_id)

    if issue_type:
        query = query.filter(QualityIssue.issue_type == issue_type)
    if severity:
        query = query.filter(QualityIssue.severity == severity)
    if module:
        query = query.filter(QualityIssue.affected_module == module)
    if status:
        query = query.filter(QualityIssue.status == status)
    if search:
        like = f"%{search}%"
        from sqlalchemy import or_
        query = query.filter(or_(
            QualityIssue.description.ilike(like),
            QualityIssue.affected_record.ilike(like),
            QualityIssue.issue_type.ilike(like),
        ))
    if date_from:
        query = query.filter(QualityIssue.detected_at >= date_from)
    if date_to:
        query = query.filter(QualityIssue.detected_at <= date_to)

    issues = query.order_by(QualityIssue.detected_at.desc()).all()
    return [{
        "id": i.id, "issue_type": i.issue_type, "severity": i.severity,
        "affected_module": i.affected_module, "affected_record": i.affected_record,
        "description": i.description, "status": i.status,
        "detected_at": str(i.detected_at),
    } for i in issues]


def get_issue(db, user, issue_id):
    i = db.query(QualityIssue).filter(
        QualityIssue.id == issue_id,
        QualityIssue.company_id == user.company_id).first()
    if not i:
        raise HTTPException(404, "Issue not found")
    return {
        "id": i.id, "issue_type": i.issue_type, "severity": i.severity,
        "affected_module": i.affected_module, "affected_record": i.affected_record,
        "description": i.description, "details": i.details, "status": i.status,
        "detected_at": str(i.detected_at), "resolved_by": i.resolved_by,
        "resolved_at": str(i.resolved_at) if i.resolved_at else None,
        "resolution_note": i.resolution_note, "previous_status": i.previous_status,
    }


def resolve_issue(db, user, issue_id, data):
    i = db.query(QualityIssue).filter(
        QualityIssue.id == issue_id,
        QualityIssue.company_id == user.company_id).first()
    if not i:
        raise HTTPException(404, "Issue not found")

    i.previous_status = i.status
    i.status = data.status
    if data.status in ("Resolved", "Ignored"):
        i.resolved_by = user.email
        i.resolved_at = datetime.utcnow()
        i.resolution_note = data.resolution_note

    db.commit()
    db.refresh(i)

    audit_service.write_log(db, user.company_id, user.email,
                            "Issue Resolution", f"Issue #{issue_id} -> {data.status}")

    return get_issue(db, user, issue_id)


def get_reconciliation_history(db, user):
    records = (db.query(ReconciliationHistory)
               .filter(ReconciliationHistory.company_id == user.company_id)
               .order_by(ReconciliationHistory.started_at.desc())
               .limit(50).all())
    return [{
        "id": r.id, "triggered_by": r.triggered_by,
        "records_checked": r.records_checked, "issues_detected": r.issues_detected,
        "issues_resolved": r.issues_resolved, "failed_checks": r.failed_checks,
        "status": r.status, "started_at": str(r.started_at),
        "completed_at": str(r.completed_at) if r.completed_at else None,
    } for r in records]


def get_filter_options(db, user):
    issues = db.query(QualityIssue).filter(QualityIssue.company_id == user.company_id).all()
    types = sorted(set(i.issue_type for i in issues))
    modules = sorted(set(i.affected_module for i in issues))
    return {"types": types, "modules": modules}