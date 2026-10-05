from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text, Float

from src.config.database import Base


class ImportJob(Base):
    __tablename__ = "import_jobs"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, nullable=False, index=True)
    import_type = Column(String, nullable=False)        
    filename = Column(String, nullable=False)
    uploaded_by = Column(String, nullable=False)         

    
    status = Column(String, default="Uploaded", index=True)
    
    progress = Column(Integer, default=0)                

    
    total_records = Column(Integer, default=0)
    successful_records = Column(Integer, default=0)
    failed_records = Column(Integer, default=0)
    skipped_records = Column(Integer, default=0)          
    duplicate_records = Column(Integer, default=0)

    
    error_details = Column(Text, default="")         

    
    file_content = Column(Text, nullable=True)            

    
    processing_duration = Column(Float, default=0)      
    created_at = Column(DateTime, default=datetime.utcnow, index=True)  
    started_at = Column(DateTime, nullable=True)         
    completed_at = Column(DateTime, nullable=True)        