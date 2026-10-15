from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text, Float

from src.config.database import Base


class SystemError(Base):
    __tablename__ = "system_errors"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, nullable=True, index=True)
    error_category = Column(String, nullable=False)        
    affected_component = Column(String, nullable=False)     
    source = Column(String, nullable=True)                 
    severity = Column(String, default="Medium")            
    message = Column(Text, nullable=False)                 
    occurrence_count = Column(Integer, default=1)          
    status = Column(String, default="Open", index=True)    
    error_key = Column(String, nullable=True, index=True)  
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, nullable=True, index=True)
    title = Column(String, nullable=False)
    affected_component = Column(String, nullable=True)
    severity = Column(String, default="Medium")            
    status = Column(String, default="Open", index=True)    
    description = Column(Text, nullable=True)
    investigation_notes = Column(Text, nullable=True)
    resolution = Column(Text, nullable=True)

    created_by = Column(String, nullable=True)
    resolved_by = Column(String, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class IncidentHistory(Base):
    __tablename__ = "incident_history"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, nullable=False, index=True)
    action = Column(String, nullable=False)               
    performed_by = Column(String, nullable=False)
    note = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)