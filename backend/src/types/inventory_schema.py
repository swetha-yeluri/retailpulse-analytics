
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class InventoryOut(BaseModel):
    id: int
    product_id: int
    product_name: str = ""
    sku: str = ""
    category_name: str = ""
    brand: Optional[str] = None
    current_stock: int
    reserved_stock: int
    available_stock: int
    reorder_level: int
    stock_status: str

    class Config:
        from_attributes = True


class StockAdjust(BaseModel):
    product_id: int
    adjustment_type: str            # Stock In / Stock Out / Manual Adjustment
    quantity: int = Field(..., gt=0)
    reason: str = Field(..., min_length=1)
    remarks: Optional[str] = None


class ReorderUpdate(BaseModel):
    reorder_level: int = Field(..., ge=0)


class MovementOut(BaseModel):
    id: int
    movement_type: str
    quantity_changed: int
    previous_quantity: int
    updated_quantity: int
    reason: Optional[str] = None
    remarks: Optional[str] = None
    performed_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InventorySummary(BaseModel):
    total_products: int
    total_inventory_quantity: int
    low_stock_products: int
    out_of_stock_products: int