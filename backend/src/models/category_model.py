
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from src.config.database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, default="Active")          
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)