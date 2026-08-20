from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.models.category_model import Category
from src.models.product_model import Product
from src.models.sale_model import Sale
from src.models.sale_item_model import SaleItem
from src.services import audit_service



LEAD_TIME_DAYS = 7          
SAFETY_STOCK_DAYS = 3       
HISTORY_DAYS = 30           
FORECAST_DAYS = 30          


def _avg_daily_sales(db: Session, product, company_id: int) -> float:
    """Average daily demand = total historical sales / history days.
    Moving average approach (Task 11 forecasting)."""
    cutoff = datetime.utcnow() - timedelta(days=HISTORY_DAYS)

    items = (db.query(SaleItem)
             .join(Sale, Sale.id == SaleItem.sale_id)
             .filter(SaleItem.product_id == product.id,
                     Sale.company_id == company_id,
                     Sale.sale_date >= cutoff)
             .all())

    total_qty = sum(it.quantity for it in items)
    return round(total_qty / HISTORY_DAYS, 2)         # avg per day


def _classify_risk(current_stock, avg_daily, reorder_point, forecasted) -> str:
    
    if current_stock == 0:
        return "Out of Stock"
    if avg_daily == 0:
        
        return "Overstock" if current_stock > forecasted else "Healthy"
    if current_stock <= reorder_point * 0.5:
        return "Stockout Risk"                        
    if current_stock <= reorder_point:
        return "Low Stock"                            
    if current_stock > forecasted * 2 and current_stock > reorder_point * 3:
        return "Overstock"                           
    return "Healthy"


def _recommendation_text(risk: str, reorder_qty: int) -> str:

    if risk == "Out of Stock":
        return f"Out of stock. Immediate reorder of {reorder_qty} units required."
    if risk == "Stockout Risk":
        return f"High stockout risk. Reorder {reorder_qty} units soon."
    if risk == "Low Stock":
        return f"Stock below reorder point. Consider ordering {reorder_qty} units."
    if risk == "Overstock":
        return "Overstock detected. Hold further purchases."
    return "Stock level healthy. No action needed."


def _compute_row(db: Session, product, company_id: int):
    
    avg_daily = _avg_daily_sales(db, product, company_id)
    current_stock = product.stock_quantity

    
    forecasted = round(avg_daily * FORECAST_DAYS, 2)

    
    safety_stock = round(avg_daily * SAFETY_STOCK_DAYS, 2)

    
    reorder_point = round((avg_daily * LEAD_TIME_DAYS) + safety_stock, 2)

    
    if avg_daily > 0:
        days_remaining = round(current_stock / avg_daily, 1)
    else:
        days_remaining = 999 if current_stock > 0 else 0   

    
    risk = _classify_risk(current_stock, avg_daily, reorder_point, forecasted)


    
    if current_stock <= reorder_point:
        reorder_qty = int(max(0, round((forecasted + safety_stock) - current_stock)))
    else:
        reorder_qty = 0                               

    category = db.query(Category).filter(Category.id == product.category_id).first()

    return {
        "product_id": product.id,
        "product_name": product.name,
        "sku": product.sku,
        "category_name": category.name if category else "",
        "current_stock": current_stock,
        "average_daily_sales": avg_daily,
        "forecasted_demand": forecasted,
        "days_of_stock_remaining": days_remaining,
        "reorder_point": reorder_point,
        "recommended_reorder_quantity": reorder_qty,
        "safety_stock": safety_stock,
        "stock_risk": risk,
        "recommendation": _recommendation_text(risk, reorder_qty),
    }


def get_forecast(db: Session, user, risk="", category_id=None,
                 reorder_only=False, sort_by="risk"):
    company_id = user.company_id

    products = db.query(Product).filter(Product.company_id == company_id).all()

    rows = [_compute_row(db, p, company_id) for p in products]

    
    if risk:
        rows = [r for r in rows if r["stock_risk"] == risk]
    if category_id:
        rows = [r for r in rows if _cat_match(db, r["product_id"], category_id)]
    if reorder_only:
        rows = [r for r in rows if r["recommended_reorder_quantity"] > 0]


    if sort_by == "current_stock":
        rows.sort(key=lambda r: r["current_stock"])
    elif sort_by == "forecasted_demand":
        rows.sort(key=lambda r: r["forecasted_demand"], reverse=True)
    elif sort_by == "days_remaining":
        rows.sort(key=lambda r: r["days_of_stock_remaining"])
    elif sort_by == "recommended_quantity":
        rows.sort(key=lambda r: r["recommended_reorder_quantity"], reverse=True)
    else:  
        risk_order = {"Out of Stock": 0, "Stockout Risk": 1, "Low Stock": 2,
                      "Healthy": 3, "Overstock": 4}
        rows.sort(key=lambda r: risk_order.get(r["stock_risk"], 5))

    
    summary = {
        "products_requiring_reorder": sum(1 for r in rows if r["recommended_reorder_quantity"] > 0),
        "products_at_stockout_risk": sum(1 for r in rows if r["stock_risk"] in ("Out of Stock", "Stockout Risk")),
        "overstocked_products": sum(1 for r in rows if r["stock_risk"] == "Overstock"),
        "healthy_products": sum(1 for r in rows if r["stock_risk"] == "Healthy"),
    }

    
    chart_rows = sorted(rows, key=lambda r: r["forecasted_demand"], reverse=True)[:10]
    demand_chart = [
        {"label": r["product_name"],
         "historical": round(r["average_daily_sales"] * HISTORY_DAYS, 2),  
         "forecasted": r["forecasted_demand"]}
        for r in chart_rows
    ]

    audit_service.write_log(db, company_id, user.email,
                            "Inventory Forecast Viewed", f"{len(rows)} products")

    return {
        "summary": summary,
        "forecasts": rows,
        "demand_chart": demand_chart,
    }


def _cat_match(db: Session, product_id: int, category_id: int) -> bool:
    p = db.query(Product).filter(Product.id == product_id).first()
    return p and p.category_id == category_id


def get_recommendation(db: Session, user, product_id: int):
    
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.company_id == user.company_id).first()
    if not product:
        raise HTTPException(404, "Product not found")

    row = _compute_row(db, product, user.company_id)

    
    recommended_stock = round(row["reorder_point"] + row["forecasted_demand"], 2)

    metrics = [
        {"metric": "Stock", "current": row["current_stock"],
         "recommended": recommended_stock,
         "action_needed": row["current_stock"] < row["reorder_point"]},
        {"metric": "Daily Demand", "current": row["average_daily_sales"],
         "recommended": row["average_daily_sales"], "action_needed": False},
        {"metric": "Reorder Point", "current": row["reorder_point"],
         "recommended": row["reorder_point"], "action_needed": False},
        {"metric": "Safety Stock", "current": row["safety_stock"],
         "recommended": row["safety_stock"], "action_needed": False},
    ]

    notes = []
    if row["current_stock"] < row["reorder_point"]:
        notes.append("Current stock below recommended level. Reorder required.")
    if row["stock_risk"] == "Overstock":
        notes.append("Overstock detected. Reduce future purchases.")
    if row["stock_risk"] == "Out of Stock":
        notes.append("Product is out of stock. Immediate action needed.")
    if not notes:
        notes.append("Inventory levels are healthy.")

    return {
        "product_id": product.id,
        "product_name": product.name,
        "metrics": metrics,
        "notes": notes,
    }