from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.sql import func
from src.config.database import Base


class Integration(Base):
    __tablename__ = "integrations"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)

    name = Column(String, nullable=False)
    source_type = Column(String, nullable=False)        
    target_module = Column(String, nullable=False)     
    auth_method = Column(String, default="None")        
    sync_frequency = Column(String, default="Manual")   

    
    config = Column(Text, default="{}")                
    secret_ref = Column(Text, default="")              

    status = Column(String, default="Inactive")        
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    last_sync_status = Column(String, nullable=True)

    created_by = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FieldMapping(Base):
    __tablename__ = "field_mappings"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    integration_id = Column(Integer, ForeignKey("integrations.id"), nullable=False)

    source_field = Column(String, nullable=False)     
    target_field = Column(String, nullable=False)       
    is_required = Column(Boolean, default=False)
    data_type = Column(String, default="string")       
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SyncSchedule(Base):
    __tablename__ = "sync_schedules"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    integration_id = Column(Integer, ForeignKey("integrations.id"), nullable=False)

    frequency = Column(String, default="Daily")       
    execution_time = Column(String, default="09:00")
    is_active = Column(Boolean, default=True)
    next_run = Column(DateTime(timezone=True), nullable=True)
    last_run = Column(DateTime(timezone=True), nullable=True)
    last_result = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SyncHistory(Base):
    __tablename__ = "sync_history"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    integration_id = Column(Integer, ForeignKey("integrations.id"), nullable=False)

    integration_name = Column(String, nullable=False)
    triggered_by = Column(String, nullable=False)
    sync_type = Column(String, default="Manual")        

    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, default=0)

    records_processed = Column(Integer, default=0)
    records_inserted = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    records_skipped = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)

    status = Column(String, default="Pending")         
    summary = Column(Text, default="")


class FailedRecord(Base):
    __tablename__ = "failed_records"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    sync_id = Column(Integer, ForeignKey("sync_history.id"), nullable=False)

    source_identifier = Column(String, nullable=True)   
    row_number = Column(Integer, nullable=True)
    error_category = Column(String, nullable=True)      
    error_message = Column(Text, nullable=True)
    raw_data = Column(Text, default="{}")
    processing_status = Column(String, default="Failed") 
    created_at = Column(DateTime(timezone=True), server_default=func.now())