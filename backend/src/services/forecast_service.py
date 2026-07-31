from collections import defaultdict
from datetime import datetime

from sqlalchemy.orm import Session

from src.models.category_model import Category
from src.models.product_model import Product
from src.models.sale_model import Sale
from src.models.sale_item_model import SaleItem
from src.models.demand_forecast_model import DemandForecast
from src.models.forecast_history_model import ForecastHistory
from src.services import audit_service



PERIOD_DAYS = {"7 Days": 7, "30 Days": 30, "90 Days": 90}


def _moving_average(quantities: list) -> float:
    
    if not quantities:
        return 0
    return sum(quantities) / len(quantities)


def _recommendation(current_stock: int, predicted: float, reorder_level: int) -> str:
    
    if current_stock == 0:
        return "Immediate Restock Required"         
    if current_stock < predicted:
        return "Reorder Soon"                         
    if current_stock > predicted * 2:
        return "Overstock Risk"                     
    return "Stock Level Healthy"                     


def _product_forecast(db: Session, product, period: str):
    
    days = PERIOD_DAYS.get(period, 30)

    
    items = (db.query(SaleItem)
             .join(Sale, Sale.id == SaleItem.sale_id)
             .filter(SaleItem.product_id == product.id,
                     Sale.company_id == product.company_id)
             .all())

    quantities = [it.quantity for it in items]        
    total_historical = sum(quantities)

    
    avg_per_sale = _moving_average(quantities)
    predicted = round(avg_per_sale * (days / 7), 2)    

    
    confidence = min(len(quantities) * 20, 95) if quantities else 0

    category = db.query(Category).filter(Category.id == product.category_id).first()

    return {
        "product_id": product.id,
        "product_name": product.name,
        "category_name": category.name if category else "",
        "current_stock": product.stock_quantity,
        "historical_sales": total_historical,
        "predicted_demand": predicted,
        "forecast_period": period,
        "confidence_level": confidence,
        "recommendation": _recommendation(
            product.stock_quantity, predicted,
            getattr(product, "reorder_level", 10)),
    }


def get_forecast(db: Session, user, period: str = "30 Days"):
    company_id = user.company_id

    
    products = (db.query(Product)
                .filter(Product.company_id == company_id,
                        Product.status == "Active")
                .all())

    product_forecasts = []
    for p in products:
        pf = _product_forecast(db, p, period)
        
        if pf["historical_sales"] > 0:
            product_forecasts.append(pf)

    
    total_predicted = sum(pf["predicted_demand"] for pf in product_forecasts)
    run_out = sum(1 for pf in product_forecasts
                  if pf["recommendation"] in ("Reorder Soon", "Immediate Restock Required"))
    high_growth = sum(1 for pf in product_forecasts
                      if pf["predicted_demand"] > pf["historical_sales"])
    slow_moving = sum(1 for pf in product_forecasts
                      if pf["predicted_demand"] < pf["historical_sales"] * 0.3)
    avg_confidence = (sum(pf["confidence_level"] for pf in product_forecasts)
                      / len(product_forecasts)) if product_forecasts else 0

    kpis = {
        "total_predicted_demand": round(total_predicted, 2),
        "products_expected_to_run_out": run_out,
        "high_growth_products": high_growth,
        "slow_moving_products": slow_moving,
        "forecast_accuracy": round(avg_confidence, 2),
    }

    
    cat_hist = defaultdict(float)
    cat_pred = defaultdict(float)
    cat_name = {}
    for pf in product_forecasts:
        cat_hist[pf["category_name"]] += pf["historical_sales"]
        cat_pred[pf["category_name"]] += pf["predicted_demand"]
    category_forecasts = []
    for name in cat_hist:
        hist = cat_hist[name]
        pred = cat_pred[name]
        growth = ((pred - hist) / hist * 100) if hist else 0
        category_forecasts.append({
            "category_id": 0, "category_name": name,
            "total_historical_sales": round(hist, 2),
            "predicted_demand": round(pred, 2),
            "expected_growth": round(growth, 2),
        })

    
    historical_vs_forecast = []
    for pf in product_forecasts[:10]:
        historical_vs_forecast.append({"label": pf["product_name"] + " (Hist)", "value": pf["historical_sales"]})
        historical_vs_forecast.append({"label": pf["product_name"] + " (Pred)", "value": pf["predicted_demand"]})

    product_demand_trend = [{"label": pf["product_name"], "value": pf["predicted_demand"]}
                            for pf in product_forecasts]

    category_demand_trend = [{"label": cf["category_name"], "value": cf["predicted_demand"]}
                             for cf in category_forecasts]

    top_predicted_products = sorted(
        [{"label": pf["product_name"], "value": pf["predicted_demand"]} for pf in product_forecasts],
        key=lambda x: x["value"], reverse=True)[:10]

    
    audit_service.write_log(db, company_id, user.email,
                            "Forecast Generated", f"Demand Forecast ({period})")

    return {
        "kpis": kpis,
        "product_forecasts": product_forecasts,
        "category_forecasts": category_forecasts,
        "historical_vs_forecast": historical_vs_forecast,
        "product_demand_trend": product_demand_trend,
        "category_demand_trend": category_demand_trend,
        "top_predicted_products": top_predicted_products,
    }