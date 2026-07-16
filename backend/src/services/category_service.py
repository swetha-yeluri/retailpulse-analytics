
from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.models.category_model import Category
from src.models.product_model import Product
from src.services import audit_service


def _out(db: Session, c: Category):
    
    count = db.query(Product).filter(Product.category_id == c.id).count()
    return {
        "id": c.id, "name": c.name, "description": c.description,
        "status": c.status, "product_count": count,
    }


def list_categories(db: Session, admin, search: str = ""):
    q = db.query(Category).filter(Category.company_id == admin.company_id)
    if search:
        q = q.filter(Category.name.ilike(f"%{search}%"))
    return [_out(db, c) for c in q.order_by(Category.created_at.desc()).all()]


def create_category(db: Session, admin, payload):
    exists = (db.query(Category)
              .filter(Category.company_id == admin.company_id,
                      Category.name.ilike(payload.name))
              .first())
    if exists:
        raise HTTPException(409, "A category with that name already exists")

    c = Category(
        company_id=admin.company_id, name=payload.name,
        description=payload.description, status=payload.status,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    audit_service.write_log(db, admin.company_id, admin.email,
                            "Category Created", c.name)
    return _out(db, c)


def _get_own(db: Session, admin, category_id: int):
    c = db.query(Category).filter(Category.id == category_id).first()
    if not c or c.company_id != admin.company_id:
        raise HTTPException(404, "Category not found")
    return c


def update_category(db: Session, admin, category_id, payload):
    c = _get_own(db, admin, category_id)
    data = payload.dict(exclude_unset=True)

    if "name" in data:
        dup = (db.query(Category)
               .filter(Category.company_id == admin.company_id,
                       Category.name.ilike(data["name"]), Category.id != category_id)
               .first())
        if dup:
            raise HTTPException(409, "A category with that name already exists")

    for field, value in data.items():
        setattr(c, field, value)
    db.commit()
    db.refresh(c)
    audit_service.write_log(db, admin.company_id, admin.email,
                            "Category Updated", c.name)
    return _out(db, c)


def delete_category(db: Session, admin, category_id):
    c = _get_own(db, admin, category_id)
    count = db.query(Product).filter(Product.category_id == c.id).count()
    if count > 0:
        raise HTTPException(400, f"Cannot delete: {count} product(s) use this category")
    name = c.name
    db.delete(c)
    db.commit()
    audit_service.write_log(db, admin.company_id, admin.email,
                            "Category Deleted", name)
    return {"message": "Category deleted"}