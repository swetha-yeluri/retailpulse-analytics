from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.services import forecast_service
from src.types.forecast_schema import ForecastResponse
from src.utils.deps import require_active_user

router = APIRouter(prefix="/api/forecast", tags=["Demand Forecasting"])


@router.get("", response_model=ForecastResponse)
def get_forecast(period: str = "30 Days",
                 db: Session = Depends(get_db),
                 user=Depends(require_active_user)):
    return forecast_service.get_forecast(db, user, period)