
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.services import auth_service
from src.types.auth_schema import (
    CompanyRegister, LoginRequest, RefreshRequest,
    ForgotPasswordRequest, ChangePasswordRequest,
)
from src.utils.deps import require_active_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _client(request: Request):
    ip = request.client.host if request.client else ""
    browser = request.headers.get("user-agent", "")
    return ip, browser


@router.post("/register")
def register(payload: CompanyRegister, request: Request, db: Session = Depends(get_db)):
    ip, browser = _client(request)
    return auth_service.register_company(db, payload, ip, browser)


@router.post("/login")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    ip, browser = _client(request)
    return auth_service.login(db, payload, ip, browser)


@router.post("/refresh")
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    return auth_service.refresh_access(db, payload.refresh_token)


@router.post("/logout")
def logout(request: Request, db: Session = Depends(get_db),
           user=Depends(require_active_user)):
    ip, browser = _client(request)
    return auth_service.logout(db, user, ip, browser)


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, request: Request,
                    db: Session = Depends(get_db)):
    ip, browser = _client(request)
    return auth_service.forgot_password(db, payload, ip, browser)


@router.post("/change-password")
def change_password(payload: ChangePasswordRequest, request: Request,
                    db: Session = Depends(get_db), user=Depends(require_active_user)):
    ip, browser = _client(request)
    return auth_service.change_password(db, user, payload, ip, browser)