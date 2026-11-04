from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean

from src.config.database import Base


class AccessRequest(Base):
    __tablename__ = "access_requests"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, nullable=False, index=True)
    requested_by = Column(String, nullable=False)          
    current_role = Column(String, nullable=True)           
    requested_role = Column(String, nullable=False)        
    reason = Column(Text, nullable=True)                  

    status = Column(String, default="Pending", index=True) 
    reviewed_by = Column(String, nullable=True)            
    review_comment = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class AccessReview(Base):
    __tablename__ = "access_reviews"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, nullable=False, index=True)
    user_email = Column(String, nullable=False)            
    user_role = Column(String, nullable=True)              
    review_status = Column(String, default="Pending")     
    review_comment = Column(Text, nullable=True)
    reviewed_by = Column(String, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class PermissionHistory(Base):
    __tablename__ = "permission_history"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, nullable=False, index=True)
    target_user = Column(String, nullable=False)           
    previous_role = Column(String, nullable=True)          
    new_role = Column(String, nullable=True)               
    changed_by = Column(String, nullable=False)            
    reason = Column(Text, nullable=True)
    related_request_id = Column(Integer, nullable=True)    
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)