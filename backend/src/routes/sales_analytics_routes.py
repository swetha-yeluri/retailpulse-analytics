from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.services import sales_analytics_service
from src.types.sales_analytics_schema import SalesAnalyticsResponse
from src.utils.deps import require_active_user

router = APIRouter(prefix="/api/analytics/sales", tags=["Sales Analytics"])


@router.get("", response_model=SalesAnalyticsResponse)
def get_sales_analytics(
    date_filter: str = "last_30_days",       
    granularity: str = "daily",              
    payment_method: str = "",                
    category_id: Optional[int] = None,       
    custom_from: Optional[str] = None,       
    custom_to: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(require_active_user),
):
    try:
        return sales_analytics_service.get_sales_analytics(
            db, user, date_filter, granularity, payment_method,
            category_id, custom_from, custom_to)
    except ValueError as e:                  
        raise HTTPException(400, str(e))