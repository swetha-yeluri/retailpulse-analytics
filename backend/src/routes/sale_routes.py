
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.services import sale_service
from src.types.sale_schema import SaleCreate, SaleUpdate, SaleOut, SalesSummary
from src.utils.deps import require_active_user

router = APIRouter(prefix="/api", tags=["Sales"])


@router.get("/sales", response_model=list[SaleOut])
def list_sales(search: str = "", category_id: Optional[int] = None,
               channel: str = "", payment: str = "", sort_by: str = "date",
               db: Session = Depends(get_db), user=Depends(require_active_user)):
    return sale_service.list_sales(db, user, search, category_id, channel, payment, sort_by)


@router.post("/sales", response_model=SaleOut)
def create_sale(payload: SaleCreate, db: Session = Depends(get_db),
                user=Depends(require_active_user)):
    return sale_service.create_sale(db, user, payload)


@router.get("/sales/summary", response_model=SalesSummary)
def sales_summary(db: Session = Depends(get_db), user=Depends(require_active_user)):
    return sale_service.sales_summary(db, user)


@router.get("/sales/{sale_id}", response_model=SaleOut)
def get_sale(sale_id: int, db: Session = Depends(get_db),
             user=Depends(require_active_user)):
    return sale_service.get_sale(db, user, sale_id)


@router.put("/sales/{sale_id}", response_model=SaleOut)
def update_sale(sale_id: int, payload: SaleUpdate, db: Session = Depends(get_db),
                user=Depends(require_active_user)):
    return sale_service.update_sale(db, user, sale_id, payload)


@router.delete("/sales/{sale_id}")
def delete_sale(sale_id: int, db: Session = Depends(get_db),
                user=Depends(require_active_user)):
    return sale_service.delete_sale(db, user, sale_id)