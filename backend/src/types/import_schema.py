from typing import List, Optional
from pydantic import BaseModel



class ImportPreview(BaseModel):
    columns: List[str]                    
    rows: List[dict]                     
    total_records: int                    
    detected_columns: List[str]          



class RowError(BaseModel):
    row_number: int                       
    error: str                            
    data: dict                            



class ValidationResult(BaseModel):
    total_records: int                   
    valid_records: int                   
    invalid_records: int                 
    duplicate_records: int                
    errors: List[RowError]               
    columns_valid: bool                  
    missing_columns: List[str]           



class ImportResult(BaseModel):
    import_id: int                        
    total_records: int
    successful_records: int              
    failed_records: int                
    duplicate_records: int              
    status: str                        
    errors: List[RowError]              



class ImportHistoryOut(BaseModel):
    id: int
    import_type: str
    filename: str
    uploaded_by: str
    total_records: int
    successful_records: int
    failed_records: int
    duplicate_records: int
    status: str
    created_at: str
    completed_at: str

    class Config:
        from_attributes = True