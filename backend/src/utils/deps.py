
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.config.jwt import decode_token
from src.models.user_model import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

_credentials_error = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(token: str = Depends(oauth2_scheme),
                     db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    if not payload or payload.get("type") != "access" or "sub" not in payload:
        raise _credentials_error
    user = db.query(User).filter(User.email == payload["sub"]).first()
    if user is None:
        raise _credentials_error
    return user


def require_active_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.status != "Active":
        raise HTTPException(status_code=403, detail="Account is not active")
    return current_user


def require_admin(current_user: User = Depends(require_active_user)) -> User:
    if current_user.role not in ("Super Admin", "Company Admin"):
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user