
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from src.config.database import Base


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    current_stock = Column(Integer, default=0)
    reserved_stock = Column(Integer, default=0)
    available_stock = Column(Integer, default=0)
    reorder_level = Column(Integer, default=10)
    stock_status = Column(String, default="In Stock")   # In Stock/Low Stock/Out of Stock
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)