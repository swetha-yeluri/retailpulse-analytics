from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.models.customer_model import Customer
from src.models.customer_purchase_summary_model import CustomerPurchaseSummary
from src.services import audit_service


def _segment(summary) -> str:
    """Purchase behavior batti segment (auto-classify)."""
    if not summary or summary.total_orders == 0:
        return "New Customer"
    if summary.total_revenue >= 100000 or summary.total_orders >= 20:
        return "VIP Customer"
    if summary.total_orders >= 10:
        return "Loyal Customer"
    if summary.total_orders >= 3:
        return "Regular Customer"
    return "New Customer"


def _generate_code(db: Session, company_id: int) -> str:
    """Auto customer code — CUST-000001 (company-unique)."""
    count = db.query(Customer).filter(Customer.company_id == company_id).count()
    number = count + 1
    code = f"CUST-{number:06d}"
    while db.query(Customer).filter(Customer.company_id == company_id,
                                    Customer.customer_code == code).first():
        number += 1
        code = f"CUST-{number:06d}"
    return code


def _out(db: Session, customer: Customer):
    """Customer + purchase summary + segment → frontend dict."""
    summary = db.query(CustomerPurchaseSummary).filter(
        CustomerPurchaseSummary.customer_id == customer.id).first()
    return {
        "id": customer.id, "customer_code": customer.customer_code,
        "full_name": customer.full_name, "email": customer.email,
        "phone": customer.phone, "date_of_birth": customer.date_of_birth,
        "gender": customer.gender, "address": customer.address,
        "city": customer.city, "state": customer.state, "country": customer.country,
        "customer_type": customer.customer_type,
        "preferred_sales_channel": customer.preferred_sales_channel,
        "status": customer.status, "created_at": customer.created_at,
        "total_orders": summary.total_orders if summary else 0,
        "total_revenue": round(summary.total_revenue, 2) if summary else 0,
        "total_products_purchased": summary.total_products_purchased if summary else 0,
        "average_order_value": round(summary.average_order_value, 2) if summary else 0,
        "last_purchase_date": summary.last_purchase_date if summary else None,
        "first_purchase_date": summary.first_purchase_date if summary else None,
        "segment": _segment(summary),
    }


def create_customer(db: Session, user, payload):
    
    if db.query(Customer).filter(Customer.company_id == user.company_id,
                                 Customer.email == payload.email).first():
        raise HTTPException(409, "A customer with that email already exists")

    
    if db.query(Customer).filter(Customer.company_id == user.company_id,
                                 Customer.phone == payload.phone).first():
        raise HTTPException(409, "A customer with that phone already exists")

    code = _generate_code(db, user.company_id)     # auto customer code

    customer = Customer(
        company_id=user.company_id, customer_code=code,
        full_name=payload.full_name, email=payload.email, phone=payload.phone,
        date_of_birth=payload.date_of_birth, gender=payload.gender,
        address=payload.address, city=payload.city, state=payload.state,
        country=payload.country, customer_type=payload.customer_type,
        preferred_sales_channel=payload.preferred_sales_channel,
        status=payload.status,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    
    summary = CustomerPurchaseSummary(customer_id=customer.id)
    db.add(summary)
    db.commit()

    audit_service.write_log(db, user.company_id, user.email,
                            "Customer Created", customer.full_name)
    return _out(db, customer)


def list_customers(db: Session, user, search="", customer_type="", status="",
                   city="", sort_by="name"):
    q = db.query(Customer).filter(Customer.company_id == user.company_id)  # company isolation

    if search:
        like = f"%{search}%"
        q = q.filter((Customer.full_name.ilike(like)) |
                     (Customer.customer_code.ilike(like)) |
                     (Customer.email.ilike(like)) |
                     (Customer.phone.ilike(like)))
    if customer_type:
        q = q.filter(Customer.customer_type == customer_type)
    if status:
        q = q.filter(Customer.status == status)
    if city:
        q = q.filter(Customer.city.ilike(f"%{city}%"))

    if sort_by == "name":
        q = q.order_by(Customer.full_name.asc())
    else:
        q = q.order_by(Customer.created_at.desc())

    customers = q.all()
    results = [_out(db, c) for c in customers]

    
    if sort_by == "spend":
        results.sort(key=lambda r: r["total_revenue"], reverse=True)
    elif sort_by == "orders":
        results.sort(key=lambda r: r["total_orders"], reverse=True)

    return results


def _get_own(db: Session, user, customer_id: int):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c or c.company_id != user.company_id:      # company isolation
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
            raise HTTPException(409, "A customer with that phone already exists")

    for field, value in data.items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    audit_service.write_log(db, user.company_id, user.email,
                            "Customer Updated", customer.full_name)
    return _out(db, customer)


def delete_customer(db: Session, user, customer_id):
    customer = _get_own(db, user, customer_id)
    name = customer.full_name

    
    db.query(CustomerPurchaseSummary).filter(
        CustomerPurchaseSummary.customer_id == customer.id).delete()
    db.delete(customer)
    db.commit()
    audit_service.write_log(db, user.company_id, user.email,
                            "Customer Deleted", name)
    return {"message": "Customer deleted"}


def toggle_status(db: Session, user, customer_id):
    customer = _get_own(db, user, customer_id)
    customer.status = "Inactive" if customer.status == "Active" else "Active"
    db.commit()
    action = "Customer Deactivated" if customer.status == "Inactive" else "Customer Activated"
    audit_service.write_log(db, user.company_id, user.email, action, customer.full_name)
    return _out(db, customer)


def customer_summary(db: Session, user):
    """Analytics dashboard KPI cards."""
    customers = db.query(Customer).filter(Customer.company_id == user.company_id).all()
    total = len(customers)
    active = sum(1 for c in customers if c.status == "Active")

    
    now = datetime.utcnow()
    new_this_month = sum(1 for c in customers
                         if c.created_at.year == now.year and c.created_at.month == now.month)

    summaries = db.query(CustomerPurchaseSummary).join(
        Customer, Customer.id == CustomerPurchaseSummary.customer_id).filter(
        Customer.company_id == user.company_id).all()

    returning = sum(1 for s in summaries if s.total_orders >= 2)   
    total_revenue = sum(s.total_revenue for s in summaries)
    avg_spend = total_revenue / total if total else 0
    avg_freq = sum(s.purchase_frequency for s in summaries) / total if total else 0

    return {
        "total_customers": total,
        "active_customers": active,
        "new_customers_this_month": new_this_month,
        "returning_customers": returning,
        "average_customer_spend": round(avg_spend, 2),
        "total_revenue_generated": round(total_revenue, 2),
        "average_purchase_frequency": round(avg_freq, 2),
    }