
from typing import List
from pydantic import BaseModel


class KPICards(BaseModel):
    total_revenue: float
    total_orders: int
    total_products_sold: int
    average_order_value: float
    total_inventory_value: float
    low_stock_products: int
    out_of_stock_products: int
    total_categories: int


class ChartPoint(BaseModel):
    label: str
    value: float


class AnalyticsResponse(BaseModel):
    kpis: KPICards
    revenue_trend: List[ChartPoint]        # by date
    top_products: List[ChartPoint]         # top 10 by revenue
    top_categories: List[ChartPoint]
    sales_by_payment: List[ChartPoint]
    sales_by_channel: List[ChartPoint]
    inventory_by_category: List[ChartPoint]
    stock_status: List[ChartPoint]
    inventory_value_by_category: List[ChartPoint]