from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.services import customer_analytics_service, audit_service
from src.types.customer_analytics_schema import CustomerAnalyticsResponse
from src.utils.deps import require_active_user

router = APIRouter(prefix="/api/customer-analytics", tags=["Customer Analytics"])


@router.get("", response_model=CustomerAnalyticsResponse)
def get_customer_analytics(db: Session = Depends(get_db),
                           user=Depends(require_active_user)):
    audit_service.write_log(db, user.company_id, user.email,
                            "Customer Analytics Viewed", "Customer Analytics")
    return customer_analytics_service.get_customer_analytics(db, user)