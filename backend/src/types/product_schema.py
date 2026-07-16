
from typing import Optional
from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1)
    sku: str = Field(..., min_length=1)
    category_id: int
    brand: Optional[str] = None
    description: Optional[str] = None
    unit_price: float = Field(..., gt=0)              
    cost_price: float = Field(0, ge=0)
    stock_quantity: int = Field(0, ge=0)             
    unit_of_measure: str = "Piece"
    status: str = "Active"


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category_id: Optional[int] = None
    brand: Optional[str] = None
    description: Optional[str] = None
    unit_price: Optional[float] = Field(None, gt=0)
    cost_price: Optional[float] = Field(None, ge=0)
    stock_quantity: Optional[int] = Field(None, ge=0)
    unit_of_measure: Optional[str] = None
    status: Optional[str] = None


class ProductOut(BaseModel):
    id: int
    name: str
    sku: str
    category_id: int
    category_name: str = ""
    brand: Optional[str] = None
    description: Optional[str] = None
    unit_price: float
    cost_price: float
    stock_quantity: int
    unit_of_measure: str
    status: str

    class Config:
        from_attributes = True


class DashboardSummary(BaseModel):
    total_products: int
    active_products: int
    inactive_products: int
    total_categories: int