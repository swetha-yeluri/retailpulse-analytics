from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.services import workflow_service
from src.types.workflow_schema import (
    RequestCreate, RequestOut, RequestDetail, ReviewAction,
    ConfigCreate, ConfigOut,
)
from src.utils.deps import require_active_user

router = APIRouter(prefix="/api/workflow", tags=["Workflow"])



@router.get("/pending-count")
def pending_count(db: Session = Depends(get_db), user=Depends(require_active_user)):
    return workflow_service.get_pending_count(db, user)



@router.get("/config", response_model=list[ConfigOut])
def list_config(db: Session = Depends(get_db), user=Depends(require_active_user)):
    return workflow_service.list_configs(db, user)


@router.post("/config", response_model=ConfigOut)
def create_config(data: ConfigCreate, db: Session = Depends(get_db),
                  user=Depends(require_active_user)):
    return workflow_service.create_config(db, user, data)


@router.patch("/config/{config_id}/toggle", response_model=ConfigOut)
def toggle_config(config_id: int, db: Session = Depends(get_db),
                  user=Depends(require_active_user)):
    return workflow_service.toggle_config(db, user, config_id)



@router.post("/requests", response_model=RequestOut)
def create_request(data: RequestCreate, db: Session = Depends(get_db),
                   user=Depends(require_active_user)):
    return workflow_service.create_request(db, user, data)


@router.get("/requests")
def list_requests(
    status: str = "", request_type: str = "", my_requests: bool = False,
    page: int = Query(1, ge=1), limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db), user=Depends(require_active_user),
):
    return workflow_service.list_requests(db, user, status, request_type, my_requests, page, limit)


@router.get("/requests/{request_id}", response_model=RequestDetail)
def get_detail(request_id: int, db: Session = Depends(get_db),
               user=Depends(require_active_user)):
    return workflow_service.get_detail(db, user, request_id)


@router.post("/requests/{request_id}/approve", response_model=RequestDetail)
def approve(request_id: int, data: ReviewAction, db: Session = Depends(get_db),
            user=Depends(require_active_user)):
    return workflow_service.approve_request(db, user, request_id, data)


@router.post("/requests/{request_id}/reject", response_model=RequestDetail)
def reject(request_id: int, data: ReviewAction, db: Session = Depends(get_db),
           user=Depends(require_active_user)):
    return workflow_service.reject_request(db, user, request_id, data)


@router.post("/requests/{request_id}/cancel", response_model=RequestDetail)
def cancel(request_id: int, db: Session = Depends(get_db),
           user=Depends(require_active_user)):
    return workflow_service.cancel_request(db, user, request_id)