from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.services import governance_service
from src.types.governance_schema import (
    GovernanceDashboard, PermissionMatrix, UserAccess, RoleUpdate,
    AccessRequestCreate, AccessRequestOut, ReviewAction,
    ReviewCreate, AccessReviewOut, PermissionHistoryOut,
)
from src.utils.deps import require_active_user

router = APIRouter(prefix="/api/governance", tags=["Data Governance"])



@router.get("/dashboard", response_model=GovernanceDashboard)
def dashboard(db: Session = Depends(get_db), user=Depends(require_active_user)):
    return governance_service.get_dashboard(db, user)



@router.get("/matrix", response_model=PermissionMatrix)
def matrix(user=Depends(require_active_user)):
    return governance_service.get_matrix()



@router.get("/users", response_model=list[UserAccess])
def list_users(db: Session = Depends(get_db), user=Depends(require_active_user)):
    return governance_service.list_users(db, user)


@router.put("/users/{user_id}/role")
def update_role(user_id: int, data: RoleUpdate,
                db: Session = Depends(get_db), user=Depends(require_active_user)):
    return governance_service.update_user_role(db, user, user_id, data)


@router.patch("/users/{user_id}/toggle-status")
def toggle_status(user_id: int, db: Session = Depends(get_db),
                  user=Depends(require_active_user)):
    return governance_service.toggle_user_status(db, user, user_id)



@router.post("/requests", response_model=AccessRequestOut)
def create_request(data: AccessRequestCreate,
                   db: Session = Depends(get_db), user=Depends(require_active_user)):
    return governance_service.create_request(db, user, data)


@router.get("/requests", response_model=list[AccessRequestOut])
def list_requests(status: str = "", my_requests: bool = False,
                  db: Session = Depends(get_db), user=Depends(require_active_user)):
    return governance_service.list_requests(db, user, status, my_requests)


@router.post("/requests/{request_id}/approve", response_model=AccessRequestOut)
def approve(request_id: int, data: ReviewAction,
            db: Session = Depends(get_db), user=Depends(require_active_user)):
    return governance_service.approve_request(db, user, request_id, data)


@router.post("/requests/{request_id}/reject", response_model=AccessRequestOut)
def reject(request_id: int, data: ReviewAction,
           db: Session = Depends(get_db), user=Depends(require_active_user)):
    return governance_service.reject_request(db, user, request_id, data)


@router.post("/requests/{request_id}/cancel", response_model=AccessRequestOut)
def cancel(request_id: int, db: Session = Depends(get_db),
           user=Depends(require_active_user)):
    return governance_service.cancel_request(db, user, request_id)



@router.post("/reviews", response_model=AccessReviewOut)
def create_review(data: ReviewCreate,
                  db: Session = Depends(get_db), user=Depends(require_active_user)):
    return governance_service.create_review(db, user, data)


@router.get("/reviews", response_model=list[AccessReviewOut])
def list_reviews(db: Session = Depends(get_db), user=Depends(require_active_user)):
    return governance_service.list_reviews(db, user)



@router.get("/history", response_model=list[PermissionHistoryOut])
def history(db: Session = Depends(get_db), user=Depends(require_active_user)):
    return governance_service.get_history(db, user)