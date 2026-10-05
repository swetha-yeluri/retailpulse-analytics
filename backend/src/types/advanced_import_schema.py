from typing import List, Optional
from pydantic import BaseModel



class RowError(BaseModel):
    row_number: int
    record_info: str                  
    error_type: str                   
    error_message: str                   



class ImportPreview(BaseModel):
    columns: List[str]                   
    sample_rows: List[dict]              
    total_rows: int
    valid_rows: int
    invalid_rows: int
    duplicate_rows: int
    errors: List[RowError]               
    columns_valid: bool                 
    missing_columns: List[str]



class ImportJobOut(BaseModel):
    id: int
    import_type: str
    filename: str
    uploaded_by: str
    status: str                         
    progress: int                       
    total_records: int
    successful_records: int
    failed_records: int
    skipped_records: int
    duplicate_records: int
    processing_duration: float
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None

    class Config:
        from_attributes = True



class ImportSummary(ImportJobOut):
    errors: List[RowError]               



class TemplateColumns(BaseModel):
    import_type: str
    columns: List[str]                   
    sample_row: dict                      