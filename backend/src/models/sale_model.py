from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String

from src.config.database import Base


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)   
    invoice_number = Column(String, nullable=False)
    customer_name = Column(String, nullable=False)
    sale_date = Column(DateTime, default=datetime.utcnow)
    sales_channel = Column(String, default="Retail Store")
    payment_method = Column(String, default="Cash")
    payment_status = Column(String, default="Paid")          
    discount = Column(Float, default=0)                      
    tax = Column(Float, default=0)                           
    total_amount = Column(Float, default=0)
    notes = Column(String, nullable=True)                    
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)