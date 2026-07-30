from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from src.config.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)  
    customer_code = Column(String, nullable=False)          
    full_name = Column(String, nullable=False)              
    email = Column(String, nullable=False)                  
    phone = Column(String, nullable=False)                  
    date_of_birth = Column(String, nullable=True)           
    gender = Column(String, nullable=True)                  
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    country = Column(String, nullable=True)
    customer_type = Column(String, default="Retail")        
    preferred_sales_channel = Column(String, nullable=True) 
    status = Column(String, default="Active")               
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)