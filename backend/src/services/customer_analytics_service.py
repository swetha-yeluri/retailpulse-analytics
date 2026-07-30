from collections import defaultdict
from datetime import datetime

from sqlalchemy.orm import Session

from src.models.customer_model import Customer
from src.models.customer_purchase_summary_model import CustomerPurchaseSummary


def _segment(summary):
    
    if not summary or summary.total_orders == 0:
        return "New Customer"
    if summary.total_revenue >= 100000 or summary.total_orders >= 20:
        return "VIP Customer"
    if summary.total_orders >= 10:
        return "Loyal Customer"
    if summary.total_orders >= 3:
        return "Regular Customer"
    return "New Customer"


def get_customer_analytics(db: Session, user):
    company_id = user.company_id

    customers = db.query(Customer).filter(Customer.company_id == company_id).all()
    summaries = db.query(CustomerPurchaseSummary).join(
        Customer, Customer.id == CustomerPurchaseSummary.customer_id).filter(
        Customer.company_id == company_id).all()

    
    summ_map = {s.customer_id: s for s in summaries}

    
    total = len(customers)
    active = sum(1 for c in customers if c.status == "Active")
    now = datetime.utcnow()
    new_this_month = sum(1 for c in customers
                         if c.created_at.year == now.year and c.created_at.month == now.month)
    returning = sum(1 for s in summaries if s.total_orders >= 2)
    total_revenue = sum(s.total_revenue for s in summaries)
    avg_spend = total_revenue / total if total else 0
    avg_freq = sum(s.purchase_frequency for s in summaries) / total if total else 0

    kpis = {
        "total_customers": total,
        "active_customers": active,
        "new_this_month": new_this_month,
        "returning_customers": returning,
        "average_spend": round(avg_spend, 2),
        "total_revenue": round(total_revenue, 2),
        "average_frequency": round(avg_freq, 2),
    }

    
    growth = defaultdict(int)
    for c in customers:
        key = c.created_at.strftime("%Y-%m")
        growth[key] += 1
    growth_trend = [{"label": k, "value": v} for k, v in sorted(growth.items())]

    
    type_rev = defaultdict(float)
    for c in customers:
        s = summ_map.get(c.id)
        type_rev[c.customer_type] += s.total_revenue if s else 0
    revenue_by_type = [{"label": k, "value": round(v, 2)} for k, v in type_rev.items()]

    
    seg_count = defaultdict(int)
    for c in customers:
        seg_count[_segment(summ_map.get(c.id))] += 1
    customers_by_segment = [{"label": k, "value": v} for k, v in seg_count.items()]

    
    top = []
    for c in customers:
        s = summ_map.get(c.id)
        if s and s.total_revenue > 0:
            top.append({"label": c.full_name, "value": round(s.total_revenue, 2)})
    top_customers = sorted(top, key=lambda x: x["value"], reverse=True)[:10]

    
    city_count = defaultdict(int)
    for c in customers:
        city_count[c.city or "Unknown"] += 1
    customers_by_city = [{"label": k, "value": v} for k, v in city_count.items()]

    
    new_count = sum(1 for s in summaries if s.total_orders < 2)
    ret_count = sum(1 for s in summaries if s.total_orders >= 2)
    no_purchase = total - len(summaries) + sum(1 for s in summaries if s.total_orders == 0)
    new_vs_returning = [
        {"label": "New (0-1 order)", "value": new_count},
        {"label": "Returning (2+ orders)", "value": ret_count},
    ]

    
    chan_count = defaultdict(int)
    for c in customers:
        chan_count[c.preferred_sales_channel or "Not Set"] += 1
    customers_by_channel = [{"label": k, "value": v} for k, v in chan_count.items()]


    rev_trend = defaultdict(float)
    for s in summaries:
        if s.last_purchase_date:
            key = s.last_purchase_date.strftime("%Y-%m")
            rev_trend[key] += s.total_revenue
    revenue_trend = [{"label": k, "value": round(v, 2)} for k, v in sorted(rev_trend.items())]

    return {
        "kpis": kpis,
        "growth_trend": growth_trend,
        "revenue_by_type": revenue_by_type,
        "customers_by_segment": customers_by_segment,
        "top_customers": top_customers,
        "customers_by_city": customers_by_city,
        "new_vs_returning": new_vs_returning,
        "customers_by_channel": customers_by_channel,
        "revenue_trend": revenue_trend,
    }