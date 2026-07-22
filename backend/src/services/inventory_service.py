
from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.models.category_model import Category
from src.models.product_model import Product
from src.models.inventory_model import Inventory
from src.models.inventory_movement_model import InventoryMovement
from src.services import audit_service



def _calc_status(available: int, reorder: int) -> str:
    if available == 0:
        return "Out of Stock"
    if available <= reorder:
        return "Low Stock"
    return "In Stock"



def _get_or_create(db: Session, company_id: int, product: Product):
    inv = db.query(Inventory).filter(
        Inventory.company_id == company_id,
        Inventory.product_id == product.id).first()
    if not inv:
        stock = product.stock_quantity or 0
        inv = Inventory(
            company_id=company_id, product_id=product.id,
            current_stock=stock, reserved_stock=0, available_stock=stock,
            reorder_level=10, stock_status=_calc_status(stock, 10),
        )
        db.add(inv)
        db.commit()
        db.refresh(inv)
    return inv



def _out(db: Session, inv: Inventory):
    product = db.query(Product).filter(Product.id == inv.product_id).first()
    category = db.query(Category).filter(Category.id == product.category_id).first() if product else None
    return {
        "id": inv.id, "product_id": inv.product_id,
        "product_name": product.name if product else "",
        "sku": product.sku if product else "",
        "category_name": category.name if category else "",
        "brand": product.brand if product else None,
        "current_stock": inv.current_stock or 0,
        "reserved_stock": inv.reserved_stock or 0,
        "available_stock": inv.available_stock or 0,
        "reorder_level": inv.reorder_level or 0,
        "stock_status": inv.stock_status or "In Stock",
    }



def list_inventory(db: Session, user, search="", category_id=None,
                   status="", brand="", sort_by="name"):
    products = db.query(Product).filter(Product.company_id == user.company_id).all()
    for p in products:
        try:
            _get_or_create(db, user.company_id, p)
        except Exception:
            db.rollback()

    invs = db.query(Inventory).filter(Inventory.company_id == user.company_id).all()
    results = [_out(db, inv) for inv in invs]

    if search:
        s = search.lower()
        results = [r for r in results if s in r["product_name"].lower() or s in r["sku"].lower()]
    if category_id:
        filtered = []
        for r in results:
            prod = db.query(Product).filter(Product.id == r["product_id"]).first()
            if prod and prod.category_id == category_id:
                filtered.append(r)
        results = filtered
    if status:
        results = [r for r in results if r["stock_status"] == status]
    if brand:
        results = [r for r in results if r["brand"] and brand.lower() in r["brand"].lower()]

    if sort_by == "stock":
        results.sort(key=lambda r: r["current_stock"])
    elif sort_by == "recent":
        results.reverse()
    else:
        results.sort(key=lambda r: r["product_name"].lower())

    return results



def adjust_stock(db: Session, user, payload):
    product = db.query(Product).filter(
        Product.id == payload.product_id,
        Product.company_id == user.company_id).first()
    if not product:
        raise HTTPException(400, "Product not found")

    inv = _get_or_create(db, user.company_id, product)
    prev = inv.current_stock or 0

    if payload.adjustment_type == "Stock In":
        new_stock = prev + payload.quantity
        mtype = "Stock Addition"
    elif payload.adjustment_type == "Stock Out":
        if payload.quantity > (inv.available_stock or 0):
            raise HTTPException(400,
                f"Stock Out quantity cannot exceed available stock ({inv.available_stock})")
        new_stock = prev - payload.quantity
        mtype = "Stock Removal"
    else:  # Manual Adjustment
        new_stock = payload.quantity
        mtype = "Manual Adjustment"

    if new_stock < 0:
        raise HTTPException(400, "Stock quantity cannot become negative")

    inv.current_stock = new_stock
    inv.available_stock = new_stock - (inv.reserved_stock or 0)
    inv.stock_status = _calc_status(inv.available_stock, inv.reorder_level or 0)

    product.stock_quantity = new_stock
    if new_stock == 0:
        product.status = "Inactive"
    db.commit()

    movement = InventoryMovement(
        inventory_id=inv.id, movement_type=mtype,
        quantity_changed=payload.quantity, previous_quantity=prev,
        updated_quantity=new_stock, reason=payload.reason,
        remarks=payload.remarks, performed_by=user.email,
    )
    db.add(movement)
    db.commit()

    action = {"Stock In": "Stock Added", "Stock Out": "Stock Removed",
              "Manual Adjustment": "Stock Adjusted"}[payload.adjustment_type]
    audit_service.write_log(db, user.company_id, user.email, action, product.name)

    if inv.stock_status == "Low Stock":
        audit_service.write_log(db, user.company_id, user.email,
                                "Product Reached Low Stock", product.name)
    elif inv.stock_status == "Out of Stock":
        audit_service.write_log(db, user.company_id, user.email,
                                "Product Became Out of Stock", product.name)

    return _out(db, inv)



def update_reorder(db: Session, user, product_id, payload):
    product = db.query(Product).filter(
        Product.id == product_id, Product.company_id == user.company_id).first()
    if not product:
        raise HTTPException(404, "Product not found")

    inv = _get_or_create(db, user.company_id, product)
    inv.reorder_level = payload.reorder_level
    inv.stock_status = _calc_status(inv.available_stock or 0, inv.reorder_level)
    db.commit()

    audit_service.write_log(db, user.company_id, user.email,
                            "Reorder Level Updated", product.name)
    return _out(db, inv)



def movement_history(db: Session, user, product_id):
    product = db.query(Product).filter(
        Product.id == product_id, Product.company_id == user.company_id).first()
    if not product:
        raise HTTPException(404, "Product not found")

    inv = _get_or_create(db, user.company_id, product)
    movements = (db.query(InventoryMovement)
                 .filter(InventoryMovement.inventory_id == inv.id)
                 .order_by(InventoryMovement.created_at.desc()).all())
    return movements


# ---------- Dashboard summary ----------
def inventory_summary(db: Session, user):
    products = db.query(Product).filter(Product.company_id == user.company_id).all()
    for p in products:
        try:
            _get_or_create(db, user.company_id, p)
        except Exception:
            db.rollback()

    invs = db.query(Inventory).filter(Inventory.company_id == user.company_id).all()
    total_qty = sum((i.current_stock or 0) for i in invs)
    low = sum(1 for i in invs if i.stock_status == "Low Stock")
    out = sum(1 for i in invs if i.stock_status == "Out of Stock")

    return {
        "total_products": len(invs),
        "total_inventory_quantity": total_qty,
        "low_stock_products": low,
        "out_of_stock_products": out,
    }