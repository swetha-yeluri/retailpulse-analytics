from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class ProductForecast(BaseModel):          
    product_id: int
    product_name: str
    category_name: str
    current_stock: int                     
    historical_sales: float                
    predicted_demand: float                
    forecast_period: str                  
    confidence_level: float                
    recommendation: str                     


class CategoryForecast(BaseModel):         
    category_id: int
    category_name: str
    total_historical_sales: float
    predicted_demand: float
    expected_growth: float                  


class ForecastKPIs(BaseModel):             
    total_predicted_demand: float
    products_expected_to_run_out: int
    high_growth_products: int
    slow_moving_products: int
    forecast_accuracy: float


class ChartPoint(BaseModel):             
    label: str
    value: float


class ForecastResponse(BaseModel):          
    kpis: ForecastKPIs
    product_forecasts: List[ProductForecast]
    category_forecasts: List[CategoryForecast]
    historical_vs_forecast: List[ChartPoint]   
    product_demand_trend: List[ChartPoint]       
    category_demand_trend: List[ChartPoint]      
    top_predicted_products: List[ChartPoint]      