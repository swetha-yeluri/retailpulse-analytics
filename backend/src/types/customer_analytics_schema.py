from typing import List
from pydantic import BaseModel


class CustomerKPIs(BaseModel):            
    total_customers: int
    active_customers: int
    new_this_month: int
    returning_customers: int
    average_spend: float
    total_revenue: float
    average_frequency: float


class ChartPoint(BaseModel):                
    label: str
    value: float


class CustomerAnalyticsResponse(BaseModel):
    kpis: CustomerKPIs
    growth_trend: List[ChartPoint]      
    revenue_by_type: List[ChartPoint]      
    customers_by_segment: List[ChartPoint]  
    top_customers: List[ChartPoint]         
    customers_by_city: List[ChartPoint]     
    new_vs_returning: List[ChartPoint]    
    customers_by_channel: List[ChartPoint]  
    revenue_trend: List[ChartPoint]         