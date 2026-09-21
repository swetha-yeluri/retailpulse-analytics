from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean

from src.config.database import Base


class ReportHistory(Base):
    __tablename__ = "report_history"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, nullable=False, index=True)
    report_type = Column(String, nullable=False)         
    report_name = Column(String, nullable=False)
    generated_by = Column(String, nullable=False)      
    filters_applied = Column(Text, nullable=True)      
    format = Column(String, default="table")             
    total_records = Column(Integer, default=0)
    status = Column(String, default="Completed")         
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class ScheduledReport(Base):
    __tablename__ = "scheduled_reports"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, nullable=False, index=True)
    report_type = Column(String, nullable=False)         
    schedule_name = Column(String, nullable=False)
    filters = Column(Text, nullable=True)             
    frequency = Column(String, nullable=False)           
    execution_time = Column(String, nullable=True)       
    recipients = Column(Text, nullable=True)             
    export_format = Column(String, default="PDF")      
    is_active = Column(Boolean, default=True)           
    created_by = Column(String, nullable=False)
    last_run = Column(DateTime, nullable=True)          
    last_status = Column(String, nullable=True)          
    created_at = Column(DateTime, default=datetime.utcnow)