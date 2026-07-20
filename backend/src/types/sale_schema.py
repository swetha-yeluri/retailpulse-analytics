
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class SaleCreate(BaseModel):
    customer_name: str = Field(..., min_length=1)
    product_id: int
    quantity: int = Field(..., gt=0)                 # must be > 0
    unit_price: float = Field(..., ge=0)             # cannot be negative
    discount: float = Field(0, ge=0)
    tax: float = Field(0, ge=0)                       # cannot be negative
    sales_channel: str = "Retail Store"
    payment_method: str = "Cash"


class SaleUpdate(BaseModel):
    customer_name: Optional[str] = None
    quantity: Optional[int] = Field(None, gt=0)
    unit_price: Optional[float] = Field(None, ge=0)
    discount: Optional[float] = Field(None, ge=0)
    tax: Optional[float] = Field(None, ge=0)
    sales_channel: Optional[str] = None
    payment_method: Optional[str] = None


class SaleOut(BaseModel):
    id: int
    invoice_number: str
    customer_name: str
    sale_date: datetime
    sales_channel: str
    payment_method: str
    total_amount: float
    created_by: Optional[str] = None
    
    product_id: int
    product_name: str = ""
    category_id: int
    category_name: str = ""
    quantity: int
    unit_price: float
    discount: float
    tax: float
    remaining_stock: int = 0          
    stock_alert: str = ""            

    class Config:
        from_attributes = True


class SalesSummary(BaseModel):
    total_sales: int
    total_revenue: float
    total_orders: int
    average_order_value: float