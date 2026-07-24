
from datetime import datetime
from collections import defaultdict

from sqlalchemy.orm import Session

from src.models.category_model import Category
from src.models.product_model import Product
from src.models.sale_model import Sale
from src.models.sale_item_model import SaleItem
from src.models.inventory_model import Inventory


def get_analytics(db: Session, user, from_date=None, to_date=None,
                  category_id=None, channel="", payment=""):
    company_id = user.company_id

    # ---- filter sales ----
    sales_q = db.query(Sale).filter(Sale.company_id == company_id)
    if channel:
        sales_q = sales_q.filter(Sale.sales_channel == channel)
    if payment:
        sales_q = sales_q.filter(Sale.payment_method == payment)
    sales = sales_q.all()

    # date filter (in-memory)
    if from_date:
        fd = datetime.fromisoformat(from_date)
        sales = [s for s in sales if s.sale_date >= fd]
    if to_date:
        td = datetime.fromisoformat(to_date + "T23:59:59")
        sales = [s for s in sales if s.sale_date <= td]

    sale_ids = [s.id for s in sales]

    # ---- sale items (for product/category breakdowns) ----
    items = []
    if sale_ids:
        items = db.query(SaleItem).filter(SaleItem.sale_id.in_(sale_ids)).all()
    if category_id:
        items = [it for it in items if it.category_id == category_id]
        keep = {it.sale_id for it in items}
        sales = [s for s in sales if s.id in keep]

    # ---- KPIs ----
    total_revenue = sum(s.total_amount for s in sales)
    total_orders = len(sales)
    total_products_sold = sum(it.quantity for it in items)
    avg_order = total_revenue / total_orders if total_orders else 0

    products = db.query(Product).filter(Product.company_id == company_id).all()
    invs = db.query(Inventory).filter(Inventory.company_id == company_id).all()
    inv_value = 0.0
    for inv in invs:
        prod = next((p for p in products if p.id == inv.product_id), None)
        if prod:
            inv_value += (inv.current_stock or 0) * (prod.cost_price or 0)

    low_stock = sum(1 for i in invs if i.stock_status == "Low Stock")
    out_stock = sum(1 for i in invs if i.stock_status == "Out of Stock")
    total_categories = db.query(Category).filter(Category.company_id == company_id).count()

    kpis = {
        "total_revenue": round(total_revenue, 2),
        "total_orders": total_orders,
        "total_products_sold": total_products_sold,
        "average_order_value": round(avg_order, 2),
        "total_inventory_value": round(inv_value, 2),
        "low_stock_products": low_stock,
        "out_of_stock_products": out_stock,
        "total_categories": total_categories,
    }

    # ---- Revenue trend (by date) ----
    trend = defaultdict(float)
    for s in sales:
        key = s.sale_date.strftime("%Y-%m-%d")
        trend[key] += s.total_amount
    revenue_trend = [{"label": k, "value": round(v, 2)} for k, v in sorted(trend.items())]

    # ---- Top products (by revenue) ----
    prod_rev = defaultdict(float)
    prod_name = {}
    for it in items:
        prod_rev[it.product_id] += it.total
        p = next((x for x in products if x.id == it.product_id), None)
        prod_name[it.product_id] = p.name if p else f"#{it.product_id}"
    top_products = sorted(
        [{"label": prod_name[pid], "value": round(rev, 2)} for pid, rev in prod_rev.items()],
        key=lambda x: x["value"], reverse=True)[:10]

    # ---- Top categories (by revenue) ----
    cat_rev = defaultdict(float)
    cat_name = {}
    for it in items:
        cat_rev[it.category_id] += it.total
        c = db.query(Category).filter(Category.id == it.category_id).first()
        cat_name[it.category_id] = c.name if c else f"#{it.category_id}"
    top_categories = sorted(
        [{"label": cat_name[cid], "value": round(rev, 2)} for cid, rev in cat_rev.items()],
        key=lambda x: x["value"], reverse=True)

    # ---- Sales by payment ----
    pay = defaultdict(float)
    for s in sales:
        pay[s.payment_method] += s.total_amount
    sales_by_payment = [{"label": k, "value": round(v, 2)} for k, v in pay.items()]

    # ---- Sales by channel ----
    chan = defaultdict(float)
    for s in sales:
        chan[s.sales_channel] += s.total_amount
    sales_by_channel = [{"label": k, "value": round(v, 2)} for k, v in chan.items()]

    # ---- Inventory by category (stock qty) ----
    inv_cat = defaultdict(float)
    inv_cat_value = defaultdict(float)
    for inv in invs:
        prod = next((p for p in products if p.id == inv.product_id), None)
        if not prod:
            continue
        c = db.query(Category).filter(Category.id == prod.category_id).first()
        cname = c.name if c else "Unknown"
        inv_cat[cname] += inv.current_stock or 0
        inv_cat_value[cname] += (inv.current_stock or 0) * (prod.cost_price or 0)
    inventory_by_category = [{"label": k, "value": v} for k, v in inv_cat.items()]
    inventory_value_by_category = [{"label": k, "value": round(v, 2)} for k, v in inv_cat_value.items()]

    # ---- Stock status ----
    status_count = defaultdict(int)
    for i in invs:
        status_count[i.stock_status or "In Stock"] += 1
    stock_status = [{"label": k, "value": v} for k, v in status_count.items()]

    return {
        "kpis": kpis,
        "revenue_trend": revenue_trend,
        "top_products": top_products,
        "top_categories": top_categories,
        "sales_by_payment": sales_by_payment,
        "sales_by_channel": sales_by_channel,
        "inventory_by_category": inventory_by_category,
        "stock_status": stock_status,
        "inventory_value_by_category": inventory_value_by_category,
    }