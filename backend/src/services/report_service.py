import json
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.models.report_model import ReportHistory, ScheduledReport
from src.models.sale_model import Sale
from src.models.sale_item_model import SaleItem
from src.models.product_model import Product
from src.models.customer_model import Customer
from src.models.category_model import Category




def _sales_report(db, company_id, filters):
    query = db.query(Sale).filter(Sale.company_id == company_id)

    if filters.get("date_from"):
        query = query.filter(Sale.sale_date >= datetime.strptime(filters["date_from"], "%Y-%m-%d"))
    if filters.get("date_to"):
        query = query.filter(Sale.sale_date <= datetime.strptime(filters["date_to"] + " 23:59:59", "%Y-%m-%d %H:%M:%S"))
    if filters.get("payment_status"):
        query = query.filter(Sale.payment_status == filters["payment_status"])

    sales = query.order_by(Sale.sale_date.desc()).all()

    columns = ["Invoice", "Customer", "Channel", "Payment", "Status", "Discount", "Tax", "Total", "Date"]
    rows = [{
        "Invoice": s.invoice_number, "Customer": s.customer_name,
        "Channel": s.sales_channel, "Payment": s.payment_method,
        "Status": s.payment_status, "Discount": s.discount,
        "Tax": s.tax, "Total": s.total_amount, "Date": str(s.sale_date)[:10],
    } for s in sales]
    return columns, rows


def _inventory_report(db, company_id, filters):
    query = db.query(Product).filter(Product.company_id == company_id)

    if filters.get("category_id"):
        query = query.filter(Product.category_id == filters["category_id"])
    if filters.get("stock_status") == "low":
        query = query.filter(Product.stock_quantity < 10)
    elif filters.get("stock_status") == "out":
        query = query.filter(Product.stock_quantity == 0)

    products = query.all()

    columns = ["Product", "SKU", "Stock", "Unit Price", "Status"]
    rows = [{
        "Product": p.name, "SKU": p.sku, "Stock": p.stock_quantity,
        "Unit Price": p.unit_price, "Status": p.status,
    } for p in products]
    return columns, rows


def _customer_report(db, company_id, filters):
    query = db.query(Customer).filter(Customer.company_id == company_id)

    if filters.get("status"):
        query = query.filter(Customer.status == filters["status"])

    customers = query.all()

    columns = ["Code", "Name", "Email", "Phone", "City", "Status"]
    rows = [{
        "Code": c.customer_code, "Name": f"{c.first_name} {c.last_name}",
        "Email": c.email, "Phone": c.phone, "City": c.city or "-",
        "Status": c.status,
    } for c in customers]
    return columns, rows


def _product_performance_report(db, company_id, filters):
    
    items = (db.query(SaleItem)
             .join(Sale, Sale.id == SaleItem.sale_id)
             .filter(Sale.company_id == company_id)
             .all())

    perf = {}
    for it in items:
        product = db.query(Product).filter(Product.id == it.product_id).first()
        name = product.name if product else f"Product #{it.product_id}"
        if name not in perf:
            perf[name] = {"units": 0, "revenue": 0.0}
        perf[name]["units"] += it.quantity
        perf[name]["revenue"] += it.total

    columns = ["Product", "Units Sold", "Revenue"]
    rows = [{
        "Product": name, "Units Sold": data["units"], "Revenue": round(data["revenue"], 2),
    } for name, data in sorted(perf.items(), key=lambda x: x[1]["revenue"], reverse=True)]
    return columns, rows


def _stock_movement_report(db, company_id, filters):
    
    items = (db.query(SaleItem)
             .join(Sale, Sale.id == SaleItem.sale_id)
             .filter(Sale.company_id == company_id)
             .order_by(Sale.sale_date.desc())
             .all())

    columns = ["Date", "Product", "Type", "Quantity", "Reference"]
    rows = []
    for it in items:
        sale = db.query(Sale).filter(Sale.id == it.sale_id).first()
        product = db.query(Product).filter(Product.id == it.product_id).first()
        rows.append({
            "Date": str(sale.sale_date)[:10] if sale else "-",
            "Product": product.name if product else f"#{it.product_id}",
            "Type": "Stock Out (Sale)",
            "Quantity": it.quantity,
            "Reference": sale.invoice_number if sale else "-",
        })
    return columns, rows


REPORT_GENERATORS = {
    "Sales": _sales_report,
    "Inventory": _inventory_report,
    "Customer": _customer_report,
    "Product Performance": _product_performance_report,
    "Stock Movement": _stock_movement_report,
}


def generate_report(db, user, report_type, filters, save_history=True, fmt="table"):
    company_id = user.company_id

    generator = REPORT_GENERATORS.get(report_type)
    if not generator:
        raise HTTPException(400, f"Unknown report type: {report_type}")

    try:
        columns, rows = generator(db, company_id, filters or {})
        status = "Completed"
    except Exception as e:
        if save_history:
            _save_history(db, company_id, user.email, report_type, filters, fmt, 0, "Failed")
        raise HTTPException(500, f"Report generation failed: {str(e)}")

    if save_history:
        _save_history(db, company_id, user.email, report_type, filters, fmt, len(rows), status)

    return {
        "report_type": report_type,
        "report_name": f"{report_type} Report",
        "columns": columns,
        "rows": rows,
        "total_records": len(rows),
        "filters_applied": filters or {},
        "generated_at": str(datetime.utcnow()),
    }


def _save_history(db, company_id, email, report_type, filters, fmt, count, status):
    h = ReportHistory(
        company_id=company_id, report_type=report_type,
        report_name=f"{report_type} Report", generated_by=email,
        filters_applied=json.dumps(filters or {}), format=fmt,
        total_records=count, status=status,
    )
    db.add(h)
    db.commit()


def get_history(db, user):
    records = (db.query(ReportHistory)
               .filter(ReportHistory.company_id == user.company_id)
               .order_by(ReportHistory.created_at.desc())
               .limit(50).all())
    return [{
        "id": r.id, "report_type": r.report_type, "report_name": r.report_name,
        "generated_by": r.generated_by, "filters_applied": r.filters_applied,
        "format": r.format, "total_records": r.total_records,
        "status": r.status, "created_at": str(r.created_at),
    } for r in records]




def create_schedule(db, user, data):
    s = ScheduledReport(
        company_id=user.company_id, report_type=data.report_type,
        schedule_name=data.schedule_name,
        filters=json.dumps(data.filters or {}),
        frequency=data.frequency, execution_time=data.execution_time,
        recipients=data.recipients, export_format=data.export_format,
        is_active=data.is_active, created_by=user.email,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return _schedule_out(s)


def list_schedules(db, user):
    schedules = (db.query(ScheduledReport)
                 .filter(ScheduledReport.company_id == user.company_id)
                 .order_by(ScheduledReport.created_at.desc()).all())
    return [_schedule_out(s) for s in schedules]


def update_schedule(db, user, schedule_id, data):
    s = _get_own_schedule(db, user, schedule_id)
    if data.schedule_name is not None: s.schedule_name = data.schedule_name
    if data.filters is not None: s.filters = json.dumps(data.filters)
    if data.frequency is not None: s.frequency = data.frequency
    if data.execution_time is not None: s.execution_time = data.execution_time
    if data.recipients is not None: s.recipients = data.recipients
    if data.export_format is not None: s.export_format = data.export_format
    if data.is_active is not None: s.is_active = data.is_active
    db.commit()
    db.refresh(s)
    return _schedule_out(s)


def delete_schedule(db, user, schedule_id):
    s = _get_own_schedule(db, user, schedule_id)
    db.delete(s)
    db.commit()
    return {"deleted": True}


def toggle_schedule(db, user, schedule_id):
    s = _get_own_schedule(db, user, schedule_id)
    s.is_active = not s.is_active
    db.commit()
    db.refresh(s)
    return _schedule_out(s)


def run_schedule(db, user, schedule_id):
    """Manual run - report generate + last_run update."""
    s = _get_own_schedule(db, user, schedule_id)
    filters = json.loads(s.filters or "{}")
    try:
        generate_report(db, user, s.report_type, filters, save_history=True, fmt=s.export_format)
        s.last_run = datetime.utcnow()
        s.last_status = "Completed"
    except Exception:
        s.last_run = datetime.utcnow()
        s.last_status = "Failed"
    db.commit()
    db.refresh(s)
    return _schedule_out(s)


def _get_own_schedule(db, user, schedule_id):
    s = db.query(ScheduledReport).filter(
        ScheduledReport.id == schedule_id,
        ScheduledReport.company_id == user.company_id).first()
    if not s:
        raise HTTPException(404, "Schedule not found")
    return s


def _schedule_out(s):
    return {
        "id": s.id, "report_type": s.report_type, "schedule_name": s.schedule_name,
        "filters": s.filters, "frequency": s.frequency,
        "execution_time": s.execution_time, "recipients": s.recipients,
        "export_format": s.export_format, "is_active": s.is_active,
        "created_by": s.created_by,
        "last_run": str(s.last_run) if s.last_run else None,
        "last_status": s.last_status, "created_at": str(s.created_at),
    }