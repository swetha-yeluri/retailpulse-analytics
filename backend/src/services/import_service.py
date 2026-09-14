import csv
import io
import json
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.models.import_history_model import ImportHistory
from src.models.product_model import Product
from src.models.category_model import Category
from src.models.customer_model import Customer
from src.models.sale_model import Sale
from src.services import audit_service



REQUIRED_COLUMNS = {
    "Products": ["Product Name", "SKU", "Category", "Unit Price", "Stock Quantity"],
    "Customers": ["First Name", "Last Name", "Email", "Phone"],
    "Sales": ["Customer", "Product", "Quantity", "Unit Price"],
}


def _parse_csv(file_bytes: bytes):
    
    text = file_bytes.decode("utf-8-sig")          
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    columns = reader.fieldnames or []
    return columns, rows


def get_preview(file_bytes: bytes, import_type: str):
    
    columns, rows = _parse_csv(file_bytes)
    return {
        "columns": columns,
        "rows": rows[:5],                          
        "total_records": len(rows),
        "detected_columns": columns,
    }


def _check_columns(columns, import_type):
    
    required = REQUIRED_COLUMNS.get(import_type, [])
    missing = [c for c in required if c not in columns]
    return missing



def _validate_product_row(row):
    if not row.get("Product Name", "").strip():
        return "Product name is required"
    if not row.get("SKU", "").strip():
        return "SKU is required"
    try:
        price = float(row.get("Unit Price", 0))
        if price <= 0:
            return "Price must be greater than zero"
    except ValueError:
        return "Invalid price"
    try:
        stock = int(row.get("Stock Quantity", 0))
        if stock < 0:
            return "Stock cannot be negative"
    except ValueError:
        return "Invalid stock"
    return None                                 


def _validate_customer_row(row):
    if not row.get("First Name", "").strip():
        return "First name is required"
    if not row.get("Last Name", "").strip():
        return "Last name is required"
    email = row.get("Email", "").strip()
    if "@" not in email or "." not in email:
        return "Invalid email"
    phone = "".join(c for c in row.get("Phone", "") if c.isdigit())
    if len(phone) < 7:
        return "Invalid phone"
    return None


def _validate_sale_row(row, db, company_id):
    customer_name = row.get("Customer", "").strip()
    product_name = row.get("Product", "").strip()
    if not customer_name:
        return "Customer is required"
    if not product_name:
        return "Product is required"
    try:
        qty = int(row.get("Quantity", 0))
        if qty <= 0:
            return "Quantity must be greater than zero"
    except ValueError:
        return "Invalid quantity"
    
    product = db.query(Product).filter(
        Product.name == product_name,
        Product.company_id == company_id).first()
    if not product:
        return f"Product '{product_name}' not found"
    if qty > product.stock_quantity:
        return f"Quantity exceeds stock ({product.stock_quantity})"
    return None


def validate(db, user, file_bytes, import_type):
    
    company_id = user.company_id
    columns, rows = _parse_csv(file_bytes)

    
    missing = _check_columns(columns, import_type)
    if missing:
        return {
            "total_records": len(rows), "valid_records": 0,
            "invalid_records": 0, "duplicate_records": 0,
            "errors": [], "columns_valid": False, "missing_columns": missing,
        }

    
    errors = []
    valid_count = 0
    duplicate_count = 0
    seen = set()                                  

    for i, row in enumerate(rows, start=2):         
    
        if import_type == "Products":
            err = _validate_product_row(row)
            key = row.get("SKU", "").strip()
        elif import_type == "Customers":
            err = _validate_customer_row(row)
            key = row.get("Email", "").strip().lower()
        else:  
            err = _validate_sale_row(row, db, company_id)
            key = None

        if err:
            errors.append({"row_number": i, "error": err, "data": row})
            continue

        
        dup_err = _check_duplicate(db, company_id, import_type, row, seen)
        if dup_err:
            duplicate_count += 1
            errors.append({"row_number": i, "error": dup_err, "data": row})
            continue

        if key:
            seen.add(key)
        valid_count += 1

    return {
        "total_records": len(rows),
        "valid_records": valid_count,
        "invalid_records": len(errors) - duplicate_count,
        "duplicate_records": duplicate_count,
        "errors": errors,
        "columns_valid": True,
        "missing_columns": [],
    }


def _check_duplicate(db, company_id, import_type, row, seen):
    
    if import_type == "Products":
        sku = row.get("SKU", "").strip()
        if sku in seen:
            return f"Duplicate SKU in file: {sku}"
        exists = db.query(Product).filter(
            Product.sku == sku, Product.company_id == company_id).first()
        if exists:
            return f"SKU already exists: {sku}"
    elif import_type == "Customers":
        email = row.get("Email", "").strip().lower()
        if email in seen:
            return f"Duplicate email in file: {email}"
        exists = db.query(Customer).filter(
            Customer.email == email, Customer.company_id == company_id).first()
        if exists:
            return f"Email already exists: {email}"
    return None


def process(db, user, file_bytes, import_type, filename):
    
    company_id = user.company_id
    columns, rows = _parse_csv(file_bytes)

    
    missing = _check_columns(columns, import_type)
    if missing:
        raise HTTPException(400, f"Missing columns: {', '.join(missing)}")

    successful = 0
    failed = 0
    duplicate = 0
    errors = []
    seen = set()

    for i, row in enumerate(rows, start=2):
        try:
            
            if import_type == "Products":
                err = _validate_product_row(row)
                key = row.get("SKU", "").strip()
            elif import_type == "Customers":
                err = _validate_customer_row(row)
                key = row.get("Email", "").strip().lower()
            else:
                err = _validate_sale_row(row, db, company_id)
                key = None

            if err:
                failed += 1
                errors.append({"row_number": i, "error": err, "data": row})
                continue

            
            dup = _check_duplicate(db, company_id, import_type, row, seen)
            if dup:
                duplicate += 1
                errors.append({"row_number": i, "error": dup, "data": row})
                continue

            
            _insert_row(db, company_id, import_type, row)
            if key:
                seen.add(key)
            successful += 1

        except Exception as e:
            failed += 1
            errors.append({"row_number": i, "error": str(e), "data": row})

    db.commit()                                   

    
    if failed == 0 and duplicate == 0:
        status = "Completed"
    elif successful > 0:
        status = "Completed with Errors"
    else:
        status = "Failed"


    history = ImportHistory(
        company_id=company_id, import_type=import_type, filename=filename,
        uploaded_by=user.email, total_records=len(rows),
        successful_records=successful, failed_records=failed,
        duplicate_records=duplicate, status=status,
        error_details=json.dumps(errors), completed_at=datetime.utcnow(),
    )
    db.add(history)
    db.commit()
    db.refresh(history)

    audit_service.write_log(db, company_id, user.email,
                            "Data Import", f"{import_type}: {successful} added")

    return {
        "import_id": history.id, "total_records": len(rows),
        "successful_records": successful, "failed_records": failed,
        "duplicate_records": duplicate, "status": status, "errors": errors,
    }


def _insert_row(db, company_id, import_type, row):
    
    if import_type == "Products":
        category = db.query(Category).filter(
            Category.name == row.get("Category", "").strip(),
            Category.company_id == company_id).first()
        product = Product(
            company_id=company_id,
            name=row["Product Name"].strip(),
            sku=row["SKU"].strip(),
            category_id=category.id if category else None,
            unit_price=float(row["Unit Price"]),
            stock_quantity=int(row["Stock Quantity"]),
            status="Active",
        )
        db.add(product)
    elif import_type == "Customers":
        customer = Customer(
            company_id=company_id,
            customer_code=_gen_customer_code(db, company_id),
            first_name=row["First Name"].strip(),
            last_name=row["Last Name"].strip(),
            email=row["Email"].strip(),
            phone=row["Phone"].strip(),
            status="Active",
        )
        db.add(customer)
    


def _gen_customer_code(db, company_id):
    count = db.query(Customer).filter(Customer.company_id == company_id).count()
    return f"CUST-{count + 1:06d}"


def get_history(db, user):
    
    records = (db.query(ImportHistory)
               .filter(ImportHistory.company_id == user.company_id)
               .order_by(ImportHistory.created_at.desc())
               .all())
    return [{
        "id": r.id, "import_type": r.import_type, "filename": r.filename,
        "uploaded_by": r.uploaded_by, "total_records": r.total_records,
        "successful_records": r.successful_records, "failed_records": r.failed_records,
        "duplicate_records": r.duplicate_records, "status": r.status,
        "created_at": str(r.created_at), "completed_at": str(r.completed_at),
    } for r in records]


def get_errors(db, user, import_id):
    
    record = db.query(ImportHistory).filter(
        ImportHistory.id == import_id,
        ImportHistory.company_id == user.company_id).first()
    if not record:
        raise HTTPException(404, "Import not found")
    return json.loads(record.error_details or "[]")