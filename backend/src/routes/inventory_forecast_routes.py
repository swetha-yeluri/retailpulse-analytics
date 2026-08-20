from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.services import inventory_forecast_service
from src.types.inventory_forecast_schema import (
    InventoryForecastResponse, ComparisonPanel,
)
from src.utils.deps import require_active_user

router = APIRouter(prefix="/api/inventory/forecast", tags=["Inventory Forecast"])


@router.get("", response_model=InventoryForecastResponse)
def get_forecast(
    risk: str = "",                          
    category_id: Optional[int] = None,     
    reorder_only: bool = False,             
    sort_by: str = "risk",                   
    db: Session = Depends(get_db),
    user=Depends(require_active_user),
):
    return inventory_forecast_service.get_forecast(
        db, user, risk, category_id, reorder_only, sort_by)


@router.get("/recommendations/{product_id}", response_model=ComparisonPanel)
def get_recommendation(product_id: int,
                       db: Session = Depends(get_db),
                       user=Depends(require_active_user)):
    return inventory_forecast_service.get_recommendation(db, user, product_id)