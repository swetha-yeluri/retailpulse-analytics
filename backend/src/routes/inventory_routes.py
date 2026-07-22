
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.services import inventory_service
from src.types.inventory_schema import (
    InventoryOut, StockAdjust, ReorderUpdate, MovementOut, InventorySummary,
)
from src.utils.deps import require_active_user

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])


@router.get("", response_model=list[InventoryOut])
def list_inventory(search: str = "", category_id: Optional[int] = None,
                   status: str = "", brand: str = "", sort_by: str = "name",
                   db: Session = Depends(get_db), user=Depends(require_active_user)):
    return inventory_service.list_inventory(db, user, search, category_id, status, brand, sort_by)


@router.get("/summary", response_model=InventorySummary)
def inventory_summary(db: Session = Depends(get_db), user=Depends(require_active_user)):
    return inventory_service.inventory_summary(db, user)


@router.post("/adjust", response_model=InventoryOut)
def adjust_stock(payload: StockAdjust, db: Session = Depends(get_db),
                 user=Depends(require_active_user)):
    return inventory_service.adjust_stock(db, user, payload)


@router.put("/reorder/{product_id}", response_model=InventoryOut)
def update_reorder(product_id: int, payload: ReorderUpdate,
                   db: Session = Depends(get_db), user=Depends(require_active_user)):
    return inventory_service.update_reorder(db, user, product_id, payload)


@router.get("/movements/{product_id}", response_model=list[MovementOut])
def movement_history(product_id: int, db: Session = Depends(get_db),
                     user=Depends(require_active_user)):
    return inventory_service.movement_history(db, user, product_id)