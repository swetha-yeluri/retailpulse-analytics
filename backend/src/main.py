from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config.database import Base, engine

from src.models import (
    company_model, user_model, refresh_token_model, audit_model,
    category_model, product_model,
)
from src.routes import auth_routes, profile_routes
from src.routes import auth_routes, profile_routes, audit_routes
from src.routes import (
    auth_routes, profile_routes, audit_routes,
    category_routes, product_routes,
)
from src.models import (
    company_model, user_model, refresh_token_model, audit_model,
    category_model, product_model, sale_model, sale_item_model,
    inventory_model, inventory_movement_model, customer_model, customer_purchase_summary_model,
    demand_forecast_model, forecast_history_model,
)
from src.routes import (
    auth_routes, profile_routes, audit_routes,
    category_routes, product_routes, sale_routes, inventory_routes,
)
from src.routes import (
    auth_routes, profile_routes, audit_routes,
    category_routes, product_routes, sale_routes,
    inventory_routes, analytics_routes, customer_routes, customer_analytics_routes,
    forecast_routes, sales_analytics_routes,
)



Base.metadata.create_all(bind=engine)

app = FastAPI(title="RetailPulse Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(profile_routes.router)
app.include_router(audit_routes.router)
app.include_router(category_routes.router)
app.include_router(product_routes.router)
app.include_router(sale_routes.router)
app.include_router(inventory_routes.router)
app.include_router(analytics_routes.router)
app.include_router(customer_routes.router)
app.include_router(customer_analytics_routes.router)
app.include_router(forecast_routes.router)
app.include_router(sales_analytics_routes.router)

@app.get("/")
def root():
    return {"app": "RetailPulse Analytics", "status": "running"}