from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean

from src.config.database import Base


class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, nullable=False, index=True)
    request_type = Column(String, nullable=False, index=True)
    

    requested_by = Column(String, nullable=False)         
    related_record = Column(String, nullable=True)         
    related_id = Column(Integer, nullable=True)    

    current_values = Column(Text, nullable=True)          
    requested_values = Column(Text, nullable=True)     
    reason = Column(Text, nullable=True)               

    status = Column(String, default="Pending Approval", index=True)
    
    priority = Column(String, default="Normal")         

    
    reviewed_by = Column(String, nullable=True)         
    review_comment = Column(Text, nullable=True)           
    reviewed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RequestHistory(Base):
    __tablename__ = "request_history"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, nullable=False, index=True)
    company_id = Column(Integer, nullable=False)
    action = Column(String, nullable=False)              
    performed_by = Column(String, nullable=False)
    comment = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)


class WorkflowConfig(Base):
    __tablename__ = "workflow_config"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, nullable=False, index=True)
    request_type = Column(String, nullable=False)          
    approver_role = Column(String, default="Company Admin") 
    approval_required = Column(Boolean, default=True)       
    is_active = Column(Boolean, default=True)               
    created_at = Column(DateTime, default=datetime.utcnow)