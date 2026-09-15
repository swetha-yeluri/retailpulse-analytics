from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from src.config.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    user_email = Column(String, nullable=True, index=True)
    action = Column(String, nullable=False, index=True)
    target_name = Column(String, nullable=True)

    
    resource_type = Column(String, nullable=True, index=True)   
    resource_id = Column(String, nullable=True)                  
    description = Column(Text, nullable=True)                     
    status = Column(String, nullable=True, default="Success")   
    before_values = Column(Text, nullable=True)                  
    after_values = Column(Text, nullable=True)                   

    ip_address = Column(String, nullable=True)
    browser = Column(String, nullable=True)                      
    created_at = Column(DateTime, default=datetime.utcnow, index=True)