from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


class CustomerCreate(BaseModel):              
    full_name: str = Field(..., min_length=1)  
    email: EmailStr                            
    phone: str = Field(..., min_length=1)      
    date_of_birth: Optional[str] = None      
    gender: Optional[str] = None              
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    customer_type: str = "Retail"              
    preferred_sales_channel: Optional[str] = None
    status: str = "Active"


class CustomerUpdate(BaseModel):              
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    customer_type: Optional[str] = None
    preferred_sales_channel: Optional[str] = None
    status: Optional[str] = None


class CustomerOut(BaseModel):                 
    id: int
    customer_code: str
    full_name: str
    email: str
    phone: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    customer_type: str
    preferred_sales_channel: Optional[str] = None
    status: str
    created_at: datetime

    
    total_orders: int = 0
    total_revenue: float = 0
    total_products_purchased: int = 0
    average_order_value: float = 0
    last_purchase_date: Optional[datetime] = None
    first_purchase_date: Optional[datetime] = None
    segment: str = "New Customer"             

    class Config:
        from_attributes = True


class CustomerSummary(BaseModel):           
    total_customers: int
    active_customers: int
    new_customers_this_month: int
    returning_customers: int
    average_customer_spend: float
    total_revenue_generated: float
    average_purchase_frequency: float