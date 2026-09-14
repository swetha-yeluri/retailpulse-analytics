from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.services import import_service
from src.types.import_schema import (
    ImportPreview, ValidationResult, ImportResult, ImportHistoryOut,
)
from src.utils.deps import require_active_user

router = APIRouter(prefix="/api/import", tags=["Data Import"])

MAX_SIZE = 5 * 1024 * 1024 



def require_admin(user=Depends(require_active_user)):
    if user.role not in ("Super Admin", "Company Admin"):
        raise HTTPException(403, "Only admins can import data")
    return user


def _read_file(file: UploadFile) -> bytes:
    
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files are allowed")
    content = file.file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(400, "File too large (max 5 MB)")
    if len(content) == 0:
        raise HTTPException(400, "File is empty")
    return content


@router.post("/preview", response_model=ImportPreview)
def preview(import_type: str = Form(...),
            file: UploadFile = File(...),
            user=Depends(require_admin)):
    content = _read_file(file)
    return import_service.get_preview(content, import_type)


@router.post("/validate", response_model=ValidationResult)
def validate(import_type: str = Form(...),
             file: UploadFile = File(...),
             db: Session = Depends(get_db),
             user=Depends(require_admin)):
    content = _read_file(file)
    return import_service.validate(db, user, content, import_type)


@router.post("/process", response_model=ImportResult)
def process(import_type: str = Form(...),
            file: UploadFile = File(...),
            db: Session = Depends(get_db),
            user=Depends(require_admin)):
    content = _read_file(file)
    return import_service.process(db, user, content, import_type, file.filename)


@router.get("/history", response_model=list[ImportHistoryOut])
def history(db: Session = Depends(get_db),
            user=Depends(require_admin)):
    return import_service.get_history(db, user)


@router.get("/{import_id}/errors")
def errors(import_id: int,
           db: Session = Depends(get_db),
           user=Depends(require_admin)):
    return import_service.get_errors(db, user, import_id)