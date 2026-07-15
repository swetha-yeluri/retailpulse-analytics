
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from src.config.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    user_email = Column(String, nullable=True)
    action = Column(String, nullable=False)          
    ip_address = Column(String, nullable=True)
    browser = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)