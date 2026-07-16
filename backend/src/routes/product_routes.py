
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.services import product_service
from src.types.product_schema import (
    ProductCreate, ProductUpdate, ProductOut, DashboardSummary,
)
from src.utils.deps import require_admin

router = APIRouter(prefix="/api", tags=["Products"])


@router.get("/products", response_model=list[ProductOut])
def list_products(search: str = "", category_id: Optional[int] = None,
                  status: str = "", brand: str = "", sort_by: str = "recent",
                  db: Session = Depends(get_db), admin=Depends(require_admin)):
    return product_service.list_products(db, admin, search, category_id,
                                         status, brand, sort_by)


@router.post("/products", response_model=ProductOut)
def create_product(payload: ProductCreate, db: Session = Depends(get_db),
                   admin=Depends(require_admin)):
    return product_service.create_product(db, admin, payload)


@router.get("/products/summary", response_model=DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return product_service.dashboard_summary(db, admin)


@router.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db),
                admin=Depends(require_admin)):
    return product_service.get_product(db, admin, product_id)


@router.put("/products/{product_id}", response_model=ProductOut)
def update_product(product_id: int, payload: ProductUpdate,
                   db: Session = Depends(get_db), admin=Depends(require_admin)):
    return product_service.update_product(db, admin, product_id, payload)


@router.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db),
                   admin=Depends(require_admin)):
    return product_service.delete_product(db, admin, product_id)