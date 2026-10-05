from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.services import advanced_import_service
from src.types.advanced_import_schema import (
    ImportPreview, ImportJobOut, ImportSummary, TemplateColumns,
)
from src.utils.deps import require_active_user

router = APIRouter(prefix="/api/advanced-import", tags=["Advanced Import"])

MAX_SIZE = 10 * 1024 * 1024   



def require_admin(user=Depends(require_active_user)):
    if user.role not in ("Super Admin", "Company Admin"):
        raise HTTPException(403, "Only admins can perform imports")
    return user


def _read_file(file: UploadFile) -> bytes:
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files are allowed")
    content = file.file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(400, "File too large (max 10 MB)")
    if len(content) == 0:
        raise HTTPException(400, "File is empty")
    return content



@router.get("/template/{import_type}", response_model=TemplateColumns)
def get_template(import_type: str, user=Depends(require_admin)):
    return advanced_import_service.get_template(import_type)



@router.post("/validate", response_model=ImportPreview)
def validate(import_type: str = Form(...),
             file: UploadFile = File(...),
             db: Session = Depends(get_db),
             user=Depends(require_admin)):
    content = _read_file(file)
    return advanced_import_service.validate_file(db, user, content, import_type)



@router.post("/upload", response_model=ImportJobOut)
def upload(import_type: str = Form(...),
           file: UploadFile = File(...),
           db: Session = Depends(get_db),
           user=Depends(require_admin)):
    content = _read_file(file)
    return advanced_import_service.create_job(db, user, content, import_type, file.filename)



@router.post("/process/{job_id}", response_model=ImportSummary)
def process(job_id: int, db: Session = Depends(get_db), user=Depends(require_admin)):
    return advanced_import_service.process_job(db, user, job_id)



@router.get("/status/{job_id}", response_model=ImportJobOut)
def status(job_id: int, db: Session = Depends(get_db), user=Depends(require_admin)):
    return advanced_import_service.get_status(db, user, job_id)



@router.get("/detail/{job_id}", response_model=ImportSummary)
def detail(job_id: int, db: Session = Depends(get_db), user=Depends(require_admin)):
    return advanced_import_service.get_detail(db, user, job_id)



@router.get("/errors/{job_id}")
def errors(job_id: int, db: Session = Depends(get_db), user=Depends(require_admin)):
    return advanced_import_service.get_errors(db, user, job_id)



@router.post("/cancel/{job_id}", response_model=ImportJobOut)
def cancel(job_id: int, db: Session = Depends(get_db), user=Depends(require_admin)):
    return advanced_import_service.cancel_job(db, user, job_id)



@router.get("/history", response_model=list[ImportJobOut])
def history(db: Session = Depends(get_db), user=Depends(require_admin)):
    return advanced_import_service.get_history(db, user)