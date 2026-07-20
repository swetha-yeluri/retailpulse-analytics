
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.models.category_model import Category
from src.models.product_model import Product
from src.models.sale_model import Sale
from src.models.sale_item_model import SaleItem
from src.services import audit_service


def _generate_invoice(db: Session, company_id: int) -> str:
    year = datetime.utcnow().year
    prefix = f"INV-{year}-"
    count = db.query(Sale).filter(Sale.company_id == company_id).count()
    number = count + 1
    invoice = f"{prefix}{number:06d}"
    while db.query(Sale).filter(Sale.company_id == company_id,
                                Sale.invoice_number == invoice).first():
        number += 1
        invoice = f"{prefix}{number:06d}"
    return invoice


def _out(db: Session, sale: Sale):
    item = db.query(SaleItem).filter(SaleItem.sale_id == sale.id).first()
    product = db.query(Product).filter(Product.id == item.product_id).first() if item else None
    category = db.query(Category).filter(Category.id == item.category_id).first() if item else None

    remaining = product.stock_quantity if product else 0
    alert = ""
    if product:
        if product.stock_quantity == 0:
            alert = f"{product.name} is OUT OF STOCK"
        elif product.stock_quantity < 10:
            alert = f"{product.name} is low on stock ({product.stock_quantity} left)"

    return {
        "id": sale.id, "invoice_number": sale.invoice_number,
        "customer_name": sale.customer_name, "sale_date": sale.sale_date,
        "sales_channel": sale.sales_channel, "payment_method": sale.payment_method,
        "total_amount": sale.total_amount, "created_by": sale.created_by,
        "product_id": item.product_id if item else 0,
        "product_name": product.name if product else "",
        "category_id": item.category_id if item else 0,
        "category_name": category.name if category else "",
        "quantity": item.quantity if item else 0,
        "unit_price": item.unit_price if item else 0,
        "discount": item.discount if item else 0,
        "tax": item.tax if item else 0,
        "remaining_stock": remaining,
        "stock_alert": alert,
    }


def create_sale(db: Session, user, payload):
    product = db.query(Product).filter(
        Product.id == payload.product_id,
        Product.company_id == user.company_id).first()
    if not product:
        raise HTTPException(400, "Product not found")

    if payload.quantity > product.stock_quantity:
        raise HTTPException(400,
            f"Insufficient stock. Available: {product.stock_quantity}")

    product_value = payload.unit_price * payload.quantity
    if payload.discount > product_value:
        raise HTTPException(400, "Discount cannot exceed total product value")

    total = product_value - payload.discount + payload.tax
    invoice = _generate_invoice(db, user.company_id)

    sale = Sale(
        company_id=user.company_id, invoice_number=invoice,
        customer_name=payload.customer_name, sale_date=datetime.utcnow(),
        sales_channel=payload.sales_channel, payment_method=payload.payment_method,
        total_amount=total, created_by=user.email,
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)

    item = SaleItem(
        sale_id=sale.id, product_id=product.id, category_id=product.category_id,
        quantity=payload.quantity, unit_price=payload.unit_price,
        discount=payload.discount, tax=payload.tax, total=total,
    )
    db.add(item)

    product.stock_quantity -= payload.quantity
    audit_service.write_log(db, user.company_id, user.email,
                            "Inventory Updated", product.name)

    if product.stock_quantity == 0:
        product.status = "Inactive"
        audit_service.write_log(db, user.company_id, user.email,
                                "Product Marked Out of Stock", product.name)

    db.commit()
    audit_service.write_log(db, user.company_id, user.email,
                            "Sale Created", invoice)
    return _out(db, sale)


def list_sales(db: Session, user, search="", category_id=None, channel="",
               payment="", sort_by="date"):
    q = db.query(Sale).filter(Sale.company_id == user.company_id)

    if search:
        like = f"%{search}%"
        q = q.filter((Sale.invoice_number.ilike(like)) |
                     (Sale.customer_name.ilike(like)))
    if channel:
        q = q.filter(Sale.sales_channel == channel)
    if payment:
        q = q.filter(Sale.payment_method == payment)

    if sort_by == "invoice":
        q = q.order_by(Sale.invoice_number.asc())
    elif sort_by == "amount":
        q = q.order_by(Sale.total_amount.desc())
    else:
        q = q.order_by(Sale.sale_date.desc())

    sales = q.all()
    results = [_out(db, s) for s in sales]

    if category_id:
        results = [r for r in results if r["category_id"] == category_id]

    return results


def _get_own(db: Session, user, sale_id: int):
    s = db.query(Sale).filter(Sale.id == sale_id).first()
    if not s or s.company_id != user.company_id:
        raise HTTPException(404, "Sale not found")
    return s


def get_sale(db: Session, user, sale_id):
    return _out(db, _get_own(db, user, sale_id))


def update_sale(db: Session, user, sale_id, payload):
    sale = _get_own(db, user, sale_id)
    item = db.query(SaleItem).filter(SaleItem.sale_id == sale.id).first()
    data = payload.dict(exclude_unset=True)

    for f in ["customer_name", "sales_channel", "payment_method"]:
        if f in data:
            setattr(sale, f, data[f])

    if item:
        product = db.query(Product).filter(Product.id == item.product_id).first()

        if "quantity" in data and product:
            diff = data["quantity"] - item.quantity
            if diff > product.stock_quantity:
                raise HTTPException(400,
                    f"Insufficient stock. Available: {product.stock_quantity}")
            product.stock_quantity -= diff
            item.quantity = data["quantity"]

        for f in ["unit_price", "discount", "tax"]:
            if f in data:
                setattr(item, f, data[f])

        pv = item.unit_price * item.quantity
        if item.discount > pv:
            raise HTTPException(400, "Discount cannot exceed total product value")
        item.total = pv - item.discount + item.tax
        sale.total_amount = item.total

    db.commit()
    db.refresh(sale)
    audit_service.write_log(db, user.company_id, user.email,
                            "Sale Updated", sale.invoice_number)
    return _out(db, sale)


def delete_sale(db: Session, user, sale_id):
    sale = _get_own(db, user, sale_id)
    item = db.query(SaleItem).filter(SaleItem.sale_id == sale.id).first()

    if item:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.stock_quantity += item.quantity
        db.delete(item)

    invoice = sale.invoice_number
    db.delete(sale)
    db.commit()
    audit_service.write_log(db, user.company_id, user.email,
                            "Sale Deleted", invoice)
    return {"message": "Sale deleted"}


def sales_summary(db: Session, user):
    sales = db.query(Sale).filter(Sale.company_id == user.company_id).all()
    total_orders = len(sales)
    total_revenue = sum(s.total_amount for s in sales)
    avg = total_revenue / total_orders if total_orders else 0
    return {
        "total_sales": total_orders,
        "total_revenue": round(total_revenue, 2),
        "total_orders": total_orders,
        "average_order_value": round(avg, 2),
    }