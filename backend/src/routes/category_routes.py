
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.services import category_service
from src.types.category_schema import CategoryCreate, CategoryUpdate, CategoryOut
from src.utils.deps import require_admin

router = APIRouter(prefix="/api/categories", tags=["Categories"])


@router.get("", response_model=list[CategoryOut])
def list_categories(search: str = "", db: Session = Depends(get_db),
                    admin=Depends(require_admin)):
    return category_service.list_categories(db, admin, search)


@router.post("", response_model=CategoryOut)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db),
                    admin=Depends(require_admin)):
    return category_service.create_category(db, admin, payload)


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(category_id: int, payload: CategoryUpdate,
                    db: Session = Depends(get_db), admin=Depends(require_admin)):
    return category_service.update_category(db, admin, category_id, payload)


@router.delete("/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db),
                    admin=Depends(require_admin)):
    return category_service.delete_category(db, admin, category_id)