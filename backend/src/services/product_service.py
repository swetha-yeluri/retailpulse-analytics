
from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.models.category_model import Category
from src.models.product_model import Product
from src.services import audit_service


def _out(db: Session, p: Product):
    cat = db.query(Category).filter(Category.id == p.category_id).first()
    return {
        "id": p.id, "name": p.name, "sku": p.sku, "category_id": p.category_id,
        "category_name": cat.name if cat else "", "brand": p.brand,
        "description": p.description, "unit_price": p.unit_price,
        "cost_price": p.cost_price, "stock_quantity": p.stock_quantity,
        "unit_of_measure": p.unit_of_measure, "status": p.status,
    }


def _validate(db: Session, admin, payload, product_id=None):
    
    data = payload.dict(exclude_unset=True) if product_id else payload.dict()

    if data.get("sku"):
        q = db.query(Product).filter(Product.company_id == admin.company_id,
                                     Product.sku.ilike(data["sku"]))
        if product_id:
            q = q.filter(Product.id != product_id)
        if q.first():
            raise HTTPException(409, "SKU already exists in your company")

    if data.get("category_id"):
        cat = db.query(Category).filter(Category.id == data["category_id"],
                                        Category.company_id == admin.company_id).first()
        if not cat:
            raise HTTPException(400, "Category not found")

    current = db.query(Product).filter(Product.id == product_id).first() if product_id else None
    unit = data.get("unit_price", current.unit_price if current else None)
    cost = data.get("cost_price", current.cost_price if current else 0)
    if unit is not None and cost is not None and cost > unit:
        raise HTTPException(400, "Cost Price cannot exceed Unit Price")

    if data.get("name"):
        cat_id = data.get("category_id", current.category_id if current else None)
        q = db.query(Product).filter(Product.company_id == admin.company_id,
                                     Product.category_id == cat_id,
                                     Product.name.ilike(data["name"]))
        if product_id:
            q = q.filter(Product.id != product_id)
        if q.first():
            raise HTTPException(409, "A product with that name already exists in this category")


def list_products(db: Session, admin, search="", category_id=None, status="",
                  brand="", sort_by="recent"):
    q = db.query(Product).filter(Product.company_id == admin.company_id)

    if search:
        like = f"%{search}%"
        q = q.filter((Product.name.ilike(like)) | (Product.sku.ilike(like)) |
                     (Product.brand.ilike(like)))
    if category_id:
        q = q.filter(Product.category_id == category_id)
    if status:
        q = q.filter(Product.status == status)
    if brand:
        q = q.filter(Product.brand.ilike(f"%{brand}%"))

    if sort_by == "name":
        q = q.order_by(Product.name.asc())
    elif sort_by == "price":
        q = q.order_by(Product.unit_price.asc())
    else:
        q = q.order_by(Product.created_at.desc())

    return [_out(db, p) for p in q.all()]


def create_product(db: Session, admin, payload):
    _validate(db, admin, payload)
    p = Product(company_id=admin.company_id, **payload.dict())
    db.add(p)
    db.commit()
    db.refresh(p)
    audit_service.write_log(db, admin.company_id, admin.email,
                            "Product Created", p.name)
    return _out(db, p)


def _get_own(db: Session, admin, product_id: int):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p or p.company_id != admin.company_id:
        raise HTTPException(404, "Product not found")
    return p


def get_product(db: Session, admin, product_id):
    return _out(db, _get_own(db, admin, product_id))


def update_product(db: Session, admin, product_id, payload):
    p = _get_own(db, admin, product_id)
    _validate(db, admin, payload, product_id)

    old_status = p.status
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(p, field, value)
    db.commit()
    db.refresh(p)

    if p.status != old_status:
        action = "Product Activated" if p.status == "Active" else "Product Deactivated"
        audit_service.write_log(db, admin.company_id, admin.email, action, p.name)
    else:
        audit_service.write_log(db, admin.company_id, admin.email,
                                "Product Updated", p.name)
    return _out(db, p)


def delete_product(db: Session, admin, product_id):
    p = _get_own(db, admin, product_id)
    name = p.name
    db.delete(p)
    db.commit()
    audit_service.write_log(db, admin.company_id, admin.email,
                            "Product Deleted", name)
    return {"message": "Product deleted"}


def dashboard_summary(db: Session, admin):
    products = db.query(Product).filter(Product.company_id == admin.company_id)
    return {
        "total_products": products.count(),
        "active_products": products.filter(Product.status == "Active").count(),
        "inactive_products": products.filter(Product.status == "Inactive").count(),
        "total_categories": db.query(Category).filter(
            Category.company_id == admin.company_id).count(),
    }