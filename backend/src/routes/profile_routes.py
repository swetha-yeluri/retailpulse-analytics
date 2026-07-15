
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.models.company_model import Company
from src.types.user_schema import UserProfile
from src.utils.deps import require_active_user

router = APIRouter(prefix="/api", tags=["Profile"])


@router.get("/me", response_model=UserProfile)
def get_profile(db: Session = Depends(get_db), user=Depends(require_active_user)):
    company = db.query(Company).filter(Company.id == user.company_id).first()
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "company_id": user.company_id,
        "company_name": company.name if company else "",
        "status": user.status,
        "last_login": user.last_login,
    }