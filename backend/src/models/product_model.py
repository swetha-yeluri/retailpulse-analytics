
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String

from src.config.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    name = Column(String, nullable=False)
    sku = Column(String, nullable=False)               
    brand = Column(String, nullable=True)
    description = Column(String, nullable=True)
    unit_price = Column(Float, nullable=False)
    cost_price = Column(Float, default=0)
    stock_quantity = Column(Integer, default=0)
    unit_of_measure = Column(String, default="Piece")  
    status = Column(String, default="Active")          
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)