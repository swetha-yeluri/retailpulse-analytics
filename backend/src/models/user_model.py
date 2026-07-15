
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from src.config.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)    
    password = Column(String, nullable=False)               
    role = Column(String, default="Company Admin")          
    status = Column(String, default="Active")
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)