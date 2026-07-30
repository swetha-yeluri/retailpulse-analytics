from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer

from src.config.database import Base


class CustomerPurchaseSummary(Base):
    __tablename__ = "customer_purchase_summary"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)  
    total_orders = Column(Integer, default=0)               
    total_revenue = Column(Float, default=0)                
    total_products_purchased = Column(Integer, default=0)  
    average_order_value = Column(Float, default=0)          
    purchase_frequency = Column(Float, default=0)           
    first_purchase_date = Column(DateTime, nullable=True)   
    last_purchase_date = Column(DateTime, nullable=True)    
    favorite_product_id = Column(Integer, nullable=True)    
    favorite_category_id = Column(Integer, nullable=True)   
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)