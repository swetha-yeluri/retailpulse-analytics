from typing import List, Optional
from pydantic import BaseModel


class SalesKPIs(BaseModel):                 
    total_revenue: float
    total_orders: int
    average_order_value: float
    total_items_sold: int
    total_discount: float
    total_tax: float


class TrendPoint(BaseModel):                 
    label: str                           
    revenue: float
    orders: int                            


class ProductPerformance(BaseModel):        
    product_name: str
    units_sold: int
    revenue: float


class CustomerContribution(BaseModel):      
    customer_name: str
    orders: int
    total_spend: float
    average_order_value: float


class PaymentMethodStat(BaseModel):          
    method: str                             
    transaction_count: int
    revenue: float


class SalesAnalyticsResponse(BaseModel):     
    kpis: SalesKPIs
    trend: List[TrendPoint]                 
    top_products: List[ProductPerformance]
    top_customers: List[CustomerContribution]
    payment_methods: List[PaymentMethodStat]