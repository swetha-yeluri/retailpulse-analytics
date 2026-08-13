from collections import defaultdict
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from src.models.sale_model import Sale
from src.models.sale_item_model import SaleItem
from src.models.product_model import Product
from src.services import audit_service


def _date_range(date_filter: str, custom_from=None, custom_to=None):
    """Date filter -> (from_date, to_date). Task 10 date filters."""
    now = datetime.utcnow()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    if date_filter == "today":
        return today, now
    if date_filter == "last_7_days":
        return today - timedelta(days=7), now
    if date_filter == "last_30_days":
        return today - timedelta(days=30), now
    if date_filter == "this_month":
        return today.replace(day=1), now
    if date_filter == "last_month":
        first_this = today.replace(day=1)
        last_month_end = first_this - timedelta(days=1)
        return last_month_end.replace(day=1), last_month_end
    if date_filter == "custom" and custom_from and custom_to:
        try:
            f = datetime.strptime(custom_from, "%Y-%m-%d")
            t = datetime.strptime(custom_to, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            if f > t:
                raise ValueError("From date cannot be after To date")
            return f, t
        except ValueError as e:
            raise ValueError(str(e))
    return None, None                       


def _trend_key(date, granularity):
    """Daily/Weekly/Monthly grouping key."""
    if granularity == "daily":
        return date.strftime("%Y-%m-%d")
    if granularity == "weekly":
        
        start = date - timedelta(days=date.weekday())
        return start.strftime("%Y-%m-%d")
    return date.strftime("%Y-%m")            


def get_sales_analytics(db: Session, user, date_filter="last_30_days",
                        granularity="daily", payment_method="",
                        category_id=None, custom_from=None, custom_to=None):
    company_id = user.company_id

    
    from_date, to_date = _date_range(date_filter, custom_from, custom_to)

    
    q = db.query(Sale).filter(Sale.company_id == company_id)
    if from_date and to_date:                
        q = q.filter(Sale.sale_date >= from_date, Sale.sale_date <= to_date)
    if payment_method:                      
        q = q.filter(Sale.payment_method == payment_method)

    sales = q.all()
    sale_ids = [s.id for s in sales]

    
    items = []
    if sale_ids:
        iq = db.query(SaleItem).filter(SaleItem.sale_id.in_(sale_ids))
        if category_id:                    
            iq = iq.filter(SaleItem.category_id == category_id)
        items = iq.all()

    
    if category_id:
        valid_sale_ids = {it.sale_id for it in items}
        sales = [s for s in sales if s.id in valid_sale_ids]

    
    total_revenue = sum(s.total_amount for s in sales)
    total_orders = len(sales)
    avg_order = (total_revenue / total_orders) if total_orders else 0
    total_items = sum(it.quantity for it in items)
    total_discount = sum(s.discount for s in sales)
    total_tax = sum(s.tax for s in sales)

    kpis = {
        "total_revenue": round(total_revenue, 2),
        "total_orders": total_orders,
        "average_order_value": round(avg_order, 2),
        "total_items_sold": total_items,
        "total_discount": round(total_discount, 2),
        "total_tax": round(total_tax, 2),
    }

    
    trend_rev = defaultdict(float)
    trend_ord = defaultdict(int)
    for s in sales:
        key = _trend_key(s.sale_date, granularity)
        trend_rev[key] += s.total_amount
        trend_ord[key] += 1
    trend = [{"label": k, "revenue": round(trend_rev[k], 2), "orders": trend_ord[k]}
             for k in sorted(trend_rev.keys())]

    
    prod_rev = defaultdict(float)
    prod_qty = defaultdict(int)
    prod_name = {}
    for it in items:
        prod_rev[it.product_id] += it.total
        prod_qty[it.product_id] += it.quantity
    
    if prod_rev:
        products = db.query(Product).filter(Product.id.in_(prod_rev.keys())).all()
        prod_name = {p.id: p.name for p in products}
    top_products = sorted(
        [{"product_name": prod_name.get(pid, "Unknown"),
          "units_sold": prod_qty[pid], "revenue": round(prod_rev[pid], 2)}
         for pid in prod_rev],
        key=lambda x: x["revenue"], reverse=True)[:10]


    cust_rev = defaultdict(float)
    cust_ord = defaultdict(int)
    for s in sales:
        cust_rev[s.customer_name] += s.total_amount
        cust_ord[s.customer_name] += 1
    top_customers = sorted(
        [{"customer_name": name, "orders": cust_ord[name],
          "total_spend": round(cust_rev[name], 2),
          "average_order_value": round(cust_rev[name] / cust_ord[name], 2)}
         for name in cust_rev],
        key=lambda x: x["total_spend"], reverse=True)[:10]
    
    pay_count = defaultdict(int)
    pay_rev = defaultdict(float)
    for s in sales:
        pay_count[s.payment_method] += 1
        pay_rev[s.payment_method] += s.total_amount
    payment_methods = [{"method": m, "transaction_count": pay_count[m],
                        "revenue": round(pay_rev[m], 2)}
                       for m in pay_count]


    audit_service.write_log(db, company_id, user.email,
                            "Sales Analytics Viewed", f"Filter: {date_filter}")

    return {
        "kpis": kpis,
        "trend": trend,
        "top_products": top_products,
        "top_customers": top_customers,
        "payment_methods": payment_methods,
    }