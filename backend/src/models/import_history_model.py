from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text

from src.config.database import Base


class ImportHistory(Base):
    __tablename__ = "import_history"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, nullable=False)        
    import_type = Column(String, nullable=False)         
    filename = Column(String, nullable=False)            
    uploaded_by = Column(String, nullable=False)         

    total_records = Column(Integer, default=0)           
    successful_records = Column(Integer, default=0)      
    failed_records = Column(Integer, default=0)          
    duplicate_records = Column(Integer, default=0)       

    status = Column(String, default="Completed")         
    error_details = Column(Text, default="")             

    created_at = Column(DateTime, default=datetime.utcnow)   
    completed_at = Column(DateTime, default=datetime.utcnow) 