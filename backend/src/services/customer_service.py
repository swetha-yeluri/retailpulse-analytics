from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.models.customer_model import Customer
from src.models.customer_purchase_summary_model import CustomerPurchaseSummary
from src.services import audit_service


def _segment(summary) -> str:
    """Purchase behavior batti segment (auto)."""
    if not summary or summary.total_orders == 0:
        return "New"
    if summary.total_revenue >= 100000 or summary.total_orders >= 20:
        return "VIP"
    if summary.total_orders >= 10:
        return "Loyal"
    if summary.total_orders >= 3:
        return "Regular"
    return "New"


def _generate_code(db: Session, company_id: int) -> str:
    """Auto customer code — CUST-000001."""
    count = db.query(Customer).filter(Customer.company_id == company_id).count()
    number = count + 1
    code = f"CUST-{number:06d}"
    while db.query(Customer).filter(Customer.company_id == company_id,
                                    Customer.customer_code == code).first():
        number += 1
        code = f"CUST-{number:06d}"
    return code


def _out(db: Session, customer: Customer):
    """Customer + summary + segment → dict."""
    summary = db.query(CustomerPurchaseSummary).filter(
        CustomerPurchaseSummary.customer_id == customer.id).first()
    return {
        "id": customer.id, "customer_code": customer.customer_code,
        "first_name": customer.first_name, "last_name": customer.last_name,
        "email": customer.email, "phone": customer.phone,
        "address": customer.address, "city": customer.city,
        "state": customer.state, "country": customer.country,
        "postal_code": customer.postal_code, "status": customer.status,
        "created_at": customer.created_at,
        "total_orders": summary.total_orders if summary else 0,
        "total_revenue": round(summary.total_revenue, 2) if summary else 0,
        "last_purchase_date": summary.last_purchase_date if summary else None,
        "segment": _segment(summary),
    }


def create_customer(db: Session, user, payload):
    
    if db.query(Customer).filter(Customer.company_id == user.company_id,
                                 Customer.email == payload.email).first():
        raise HTTPException(409, "A customer with that email already exists")

    
    if db.query(Customer).filter(Customer.company_id == user.company_id,
                                 Customer.phone == payload.phone).first():
        raise HTTPException(409, "A customer with that phone number already exists")

    code = _generate_code(db, user.company_id)

    customer = Customer(
        company_id=user.company_id, customer_code=code,
        first_name=payload.first_name, last_name=payload.last_name,
        email=payload.email, phone=payload.phone,
        address=payload.address, city=payload.city, state=payload.state,
        country=payload.country, postal_code=payload.postal_code,
        status="Active",
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    
    summary = CustomerPurchaseSummary(customer_id=customer.id)
    db.add(summary)
    db.commit()

    audit_service.write_log(db, user.company_id, user.email,
                            "Customer Created", f"{customer.first_name} {customer.last_name}")
    return _out(db, customer)


def list_customers(db: Session, user, search="", segment="", status=""):
    q = db.query(Customer).filter(Customer.company_id == user.company_id) 

    if search:                                    
        like = f"%{search}%"
        q = q.filter((Customer.first_name.ilike(like)) |
                     (Customer.last_name.ilike(like)) |
                     (Customer.email.ilike(like)))
    if status:                                    
        q = q.filter(Customer.status == status)

    q = q.order_by(Customer.created_at.desc())
    customers = q.all()
    results = [_out(db, c) for c in customers]

    if segment:                                   
        results = [r for r in results if r["segment"] == segment]

    return results


def _get_own(db: Session, user, customer_id: int):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c or c.company_id != user.company_id:  
        raise HTTPException(404, "Customer not found")
    return c


def get_customer(db: Session, user, customer_id):
    return _out(db, _get_own(db, user, customer_id))


def update_customer(db: Session, user, customer_id, payload):
    customer = _get_own(db, user, customer_id)
    data = payload.dict(exclude_unset=True)      

    
    if "email" in data:
        dup = db.query(Customer).filter(
            Customer.company_id == user.company_id, Customer.email == data["email"],
            Customer.id != customer_id).first()
        if dup:
            raise HTTPException(409, "A customer with that email already exists")
    
    if "phone" in data:
        dup = db.query(Customer).filter(
            Customer.company_id == user.company_id, Customer.phone == data["phone"],
            Customer.id != customer_id).first()
        if dup:
            raise HTTPException(409, "A customer with that phone number already exists")

    for field, value in data.items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    audit_service.write_log(db, user.company_id, user.email,
                            "Customer Updated", f"{customer.first_name} {customer.last_name}")
    return _out(db, customer)


def delete_customer(db: Session, user, customer_id):
    
    customer = _get_own(db, user, customer_id)
    customer.status = "Inactive"                  
    db.commit()
    audit_service.write_log(db, user.company_id, user.email,
                            "Customer Deleted", f"{customer.first_name} {customer.last_name}")
    return {"message": "Customer deleted (soft)"}