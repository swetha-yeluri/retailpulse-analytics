import csv
import io
import json
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.models.advanced_import_model import ImportJob
from src.models.product_model import Product
from src.models.category_model import Category
from src.models.customer_model import Customer
from src.services import audit_service



TEMPLATES = {
    "Products": {
        "columns": ["Product Name", "SKU", "Category", "Unit Price", "Stock Quantity"],
        "sample": {"Product Name": "Sample Laptop", "SKU": "LAP001", "Category": "electronics",
                   "Unit Price": "50000", "Stock Quantity": "20"},
    },
    "Inventory": {
        "columns": ["SKU", "Stock Quantity"],
        "sample": {"SKU": "LAP001", "Stock Quantity": "50"},
    },
    "Customers": {
        "columns": ["First Name", "Last Name", "Email", "Phone"],
        "sample": {"First Name": "Ravi", "Last Name": "Kumar", "Email": "ravi@test.com", "Phone": "9876543210"},
    },
    "Sales": {
        "columns": ["Customer", "Product", "Quantity", "Unit Price"],
        "sample": {"Customer": "Ravi Kumar", "Product": "Sample Laptop", "Quantity": "2", "Unit Price": "50000"},
    },
}


def get_template(import_type):
    """Template columns + sample (Point: Download template)."""
    t = TEMPLATES.get(import_type)
    if not t:
        raise HTTPException(400, "Unknown import type")
    return {"import_type": import_type, "columns": t["columns"], "sample_row": t["sample"]}


def _parse_csv(content_bytes):
    text = content_bytes.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    columns = reader.fieldnames or []
    return columns, rows




def _validate_row(import_type, row, db, company_id, seen):
    """Okka row validate. Returns (error_type, error_message) or None."""
    if import_type == "Products":
        if not row.get("Product Name", "").strip():
            return ("Validation", "Product name is required")
        sku = row.get("SKU", "").strip()
        if not sku:
            return ("Validation", "SKU is required")
        try:
            if float(row.get("Unit Price", 0)) <= 0:
                return ("Validation", "Price must be greater than zero")
        except ValueError:
            return ("Validation", "Invalid price (not a number)")
        try:
            if int(row.get("Stock Quantity", 0)) < 0:
                return ("Validation", "Stock cannot be negative")
        except ValueError:
            return ("Validation", "Invalid stock (not a number)")
    
        if sku in seen:
            return ("Duplicate", f"Duplicate SKU in file: {sku}")
        if db.query(Product).filter(Product.sku == sku, Product.company_id == company_id).first():
            return ("Duplicate", f"SKU already exists: {sku}")

    elif import_type == "Customers":
        if not row.get("First Name", "").strip():
            return ("Validation", "First name is required")
        if not row.get("Last Name", "").strip():
            return ("Validation", "Last name is required")
        email = row.get("Email", "").strip().lower()
        if "@" not in email or "." not in email:
            return ("Validation", "Invalid email")
        phone = "".join(c for c in row.get("Phone", "") if c.isdigit())
        if len(phone) < 7:
            return ("Validation", "Invalid phone (min 7 digits)")
        if email in seen:
            return ("Duplicate", f"Duplicate email in file: {email}")
        if db.query(Customer).filter(Customer.email == email, Customer.company_id == company_id).first():
            return ("Duplicate", f"Email already exists: {email}")

    elif import_type == "Inventory":
        sku = row.get("SKU", "").strip()
        if not sku:
            return ("Validation", "SKU is required")
        try:
            if int(row.get("Stock Quantity", 0)) < 0:
                return ("Validation", "Stock cannot be negative")
        except ValueError:
            return ("Validation", "Invalid stock")
        
        if not db.query(Product).filter(Product.sku == sku, Product.company_id == company_id).first():
            return ("Validation", f"Product not found for SKU: {sku}")

    elif import_type == "Sales":
        if not row.get("Customer", "").strip():
            return ("Validation", "Customer is required")
        if not row.get("Product", "").strip():
            return ("Validation", "Product is required")
        try:
            if int(row.get("Quantity", 0)) <= 0:
                return ("Validation", "Quantity must be greater than zero")
        except ValueError:
            return ("Validation", "Invalid quantity")

    return None


def _get_key(import_type, row):
    if import_type == "Products":
        return row.get("SKU", "").strip()
    if import_type == "Customers":
        return row.get("Email", "").strip().lower()
    return None


def validate_file(db, user, content_bytes, import_type):
    """Full validation + preview (Point: File Validation + Preview)."""
    company_id = user.company_id
    columns, rows = _parse_csv(content_bytes)

    
    required = TEMPLATES.get(import_type, {}).get("columns", [])
    missing = [c for c in required if c not in columns]
    if missing:
        return {
            "columns": columns, "sample_rows": rows[:5], "total_rows": len(rows),
            "valid_rows": 0, "invalid_rows": 0, "duplicate_rows": 0,
            "errors": [], "columns_valid": False, "missing_columns": missing,
        }

    valid = 0
    invalid = 0
    duplicate = 0
    errors = []
    seen = set()

    for i, row in enumerate(rows, start=2):
        result = _validate_row(import_type, row, db, company_id, seen)
        if result:
            err_type, err_msg = result
            errors.append({
                "row_number": i,
                "record_info": str(dict(list(row.items())[:2])),
                "error_type": err_type, "error_message": err_msg,
            })
            if err_type == "Duplicate":
                duplicate += 1
            else:
                invalid += 1
        else:
            key = _get_key(import_type, row)
            if key:
                seen.add(key)
            valid += 1

    return {
        "columns": columns, "sample_rows": rows[:5], "total_rows": len(rows),
        "valid_rows": valid, "invalid_rows": invalid, "duplicate_rows": duplicate,
        "errors": errors, "columns_valid": True, "missing_columns": [],
    }




def create_job(db, user, content_bytes, import_type, filename):
    """Import job create (status: Uploaded)."""
    columns, rows = _parse_csv(content_bytes)
    job = ImportJob(
        company_id=user.company_id, import_type=import_type, filename=filename,
        uploaded_by=user.email, status="Uploaded", progress=0,
        total_records=len(rows), file_content=content_bytes.decode("utf-8-sig"),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    audit_service.write_log(db, user.company_id, user.email,
                            "File Uploaded", f"Import #{job.id} - {import_type}")
    return _job_out(job)


def process_job(db, user, job_id):
    """Bulk process (status tracking + integrations)."""
    job = _get_own_job(db, user, job_id)
    if job.status in ("Completed", "Completed with Errors", "Cancelled"):
        raise HTTPException(400, "Import already processed")

    started = datetime.utcnow()
    job.status = "Processing"
    job.started_at = started
    db.commit()

    audit_service.write_log(db, user.company_id, user.email,
                            "Import Started", f"Import #{job.id}")

    columns, rows = _parse_csv(job.file_content.encode("utf-8"))
    company_id = user.company_id

    successful = 0
    failed = 0
    duplicate = 0
    skipped = 0
    errors = []
    seen = set()
    total = len(rows)

    for i, row in enumerate(rows, start=2):
        
        db.refresh(job)
        if job.status == "Cancelled":
            break

        result = _validate_row(job.import_type, row, db, company_id, seen)
        if result:
            err_type, err_msg = result
            errors.append({
                "row_number": i,
                "record_info": str(dict(list(row.items())[:2])),
                "error_type": err_type, "error_message": err_msg,
            })
            if err_type == "Duplicate":
                duplicate += 1   
                skipped += 1
            else:
                failed += 1
            continue

        
        try:
            _insert_row(db, company_id, job.import_type, row)
            key = _get_key(job.import_type, row)
            if key:
                seen.add(key)
            successful += 1
        except Exception as e:
            failed += 1
            errors.append({
                "row_number": i, "record_info": str(dict(list(row.items())[:2])),
                "error_type": "Processing", "error_message": str(e)[:100],
            })

        
        if i % 10 == 0:
            job.progress = int((i / total) * 100) if total else 100
            db.commit()

    db.commit()

    
    if job.status == "Cancelled":
        status = "Cancelled"
    elif failed == 0 and duplicate == 0:
        status = "Completed"
    elif successful > 0:
        status = "Completed with Errors"
    else:
        status = "Failed"

    completed = datetime.utcnow()
    job.status = status
    job.progress = 100
    job.successful_records = successful
    job.failed_records = failed
    job.skipped_records = skipped
    job.duplicate_records = duplicate
    job.error_details = json.dumps(errors)
    job.completed_at = completed
    job.processing_duration = round((completed - started).total_seconds(), 2)
    db.commit()
    db.refresh(job)

    
    audit_service.write_log(db, company_id, user.email,
                            f"Import {status}", f"Import #{job.id} - {successful} added")

    

    return _job_out(job, errors)


def cancel_job(db, user, job_id):
    """Import cancel (Point: Cancel import)."""
    job = _get_own_job(db, user, job_id)
    if job.status in ("Completed", "Completed with Errors", "Failed"):
        raise HTTPException(400, "Cannot cancel a finished import")
    job.status = "Cancelled"
    db.commit()
    audit_service.write_log(db, user.company_id, user.email,
                            "Import Cancelled", f"Import #{job.id}")
    return _job_out(job)


def _insert_row(db, company_id, import_type, row):
    """Valid row -> DB insert."""
    if import_type == "Products":
        cat = db.query(Category).filter(
            Category.name == row.get("Category", "").strip(),
            Category.company_id == company_id).first()
        db.add(Product(
            company_id=company_id, name=row["Product Name"].strip(),
            sku=row["SKU"].strip(), category_id=cat.id if cat else None,
            unit_price=float(row["Unit Price"]), stock_quantity=int(row["Stock Quantity"]),
            status="Active",
        ))
    elif import_type == "Customers":
        count = db.query(Customer).filter(Customer.company_id == company_id).count()
        db.add(Customer(
            company_id=company_id, customer_code=f"CUST-{count+1:06d}",
            first_name=row["First Name"].strip(), last_name=row["Last Name"].strip(),
            email=row["Email"].strip(), phone=row["Phone"].strip(), status="Active",
        ))
    elif import_type == "Inventory":
        product = db.query(Product).filter(
            Product.sku == row["SKU"].strip(), Product.company_id == company_id).first()
        if product:
            product.stock_quantity = int(row["Stock Quantity"])  
    


def get_status(db, user, job_id):
    job = _get_own_job(db, user, job_id)
    return _job_out(job)


def get_detail(db, user, job_id):
    job = _get_own_job(db, user, job_id)
    errors = json.loads(job.error_details or "[]")
    return _job_out(job, errors)


def get_errors(db, user, job_id):
    job = _get_own_job(db, user, job_id)
    return json.loads(job.error_details or "[]")


def get_history(db, user):
    jobs = (db.query(ImportJob)
            .filter(ImportJob.company_id == user.company_id)
            .order_by(ImportJob.created_at.desc()).limit(50).all())
    return [_job_out(j) for j in jobs]


def _get_own_job(db, user, job_id):
    job = db.query(ImportJob).filter(
        ImportJob.id == job_id, ImportJob.company_id == user.company_id).first()
    if not job:
        raise HTTPException(404, "Import job not found")
    return job


def _job_out(job, errors=None):
    out = {
        "id": job.id, "import_type": job.import_type, "filename": job.filename,
        "uploaded_by": job.uploaded_by, "status": job.status, "progress": job.progress,
        "total_records": job.total_records, "successful_records": job.successful_records,
        "failed_records": job.failed_records, "skipped_records": job.skipped_records,
        "duplicate_records": job.duplicate_records,
        "processing_duration": job.processing_duration,
        "created_at": str(job.created_at),
        "started_at": str(job.started_at) if job.started_at else None,
        "completed_at": str(job.completed_at) if job.completed_at else None,
    }
    if errors is not None:
        out["errors"] = errors
    return out