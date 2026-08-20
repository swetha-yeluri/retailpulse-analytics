from typing import List, Optional
from pydantic import BaseModel


class ForecastRow(BaseModel):              
    product_id: int
    product_name: str
    sku: str
    category_name: str
    current_stock: int
    average_daily_sales: float             
    forecasted_demand: float                 
    days_of_stock_remaining: float         
    reorder_point: float                     
    recommended_reorder_quantity: int       
    safety_stock: float
    stock_risk: str                          
    recommendation: str                    


class ComparisonMetric(BaseModel):          
    metric: str                              
    current: float
    recommended: float
    action_needed: bool                      


class ComparisonPanel(BaseModel):            
    product_id: int
    product_name: str
    metrics: List[ComparisonMetric]
    notes: List[str]                         


class ForecastSummary(BaseModel):           
    products_requiring_reorder: int
    products_at_stockout_risk: int
    overstocked_products: int
    healthy_products: int


class ChartPoint(BaseModel):              
    label: str
    historical: float
    forecasted: float


class InventoryForecastResponse(BaseModel):  
    summary: ForecastSummary
    forecasts: List[ForecastRow]
    demand_chart: List[ChartPoint]         