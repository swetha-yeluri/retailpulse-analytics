from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text

from src.config.database import Base


class QualityIssue(Base):
    __tablename__ = "quality_issues"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, nullable=False, index=True)
    issue_type = Column(String, nullable=False, index=True)   
    severity = Column(String, default="Warning")              
    affected_module = Column(String, nullable=False)         
    affected_record = Column(String, nullable=True)        
    description = Column(Text, nullable=False)                
    details = Column(Text, nullable=True)                     
    status = Column(String, default="Open", index=True)       
    issue_key = Column(String, nullable=True, index=True)


    resolved_by = Column(String, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution_note = Column(Text, nullable=True)
    previous_status = Column(String, nullable=True)

    detected_at = Column(DateTime, default=datetime.utcnow, index=True)


class ReconciliationHistory(Base):
    __tablename__ = "reconciliation_history"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, nullable=False, index=True)
    triggered_by = Column(String, nullable=False)           
    records_checked = Column(Integer, default=0)
    issues_detected = Column(Integer, default=0)           
    issues_resolved = Column(Integer, default=0)            
    failed_checks = Column(Integer, default=0)
    status = Column(String, default="Completed")             
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)