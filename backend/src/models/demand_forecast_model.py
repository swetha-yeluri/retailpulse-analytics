from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String

from src.config.database import Base


class DemandForecast(Base):
    __tablename__ = "demand_forecasts"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)  
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)   
    category_id = Column(Integer, nullable=True)             
    forecast_period = Column(String, nullable=False)         
    predicted_demand = Column(Float, default=0)              
    confidence_score = Column(Float, default=0)              
    generated_at = Column(DateTime, default=datetime.utcnow)