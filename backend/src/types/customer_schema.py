from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class CustomerCreate(BaseModel):              
    first_name: str = Field(..., min_length=1)   
    last_name: str = Field(..., min_length=1)    
    email: EmailStr                              
    phone: str = Field(..., min_length=7)       
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None


class CustomerUpdate(BaseModel):            
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    status: Optional[str] = None


class CustomerOut(BaseModel):                
    id: int
    customer_code: str
    first_name: str
    last_name: str
    email: str
    phone: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    status: str
    created_at: datetime


    total_orders: int = 0
    total_revenue: float = 0
    last_purchase_date: Optional[datetime] = None
    segment: str = "New"

    class Config:
        from_attributes = True