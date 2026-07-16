
from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.config.jwt import create_access_token, create_refresh_token, decode_token
from src.config.settings import settings
from src.models.company_model import Company
from src.models.user_model import User
from src.models.refresh_token_model import RefreshToken
from src.services import audit_service
from src.utils.security import hash_password, verify_password


def register_company(db: Session, payload, ip="", browser=""):
    if payload.password != payload.confirm_password:
        raise HTTPException(400, "Password and Confirm Password do not match")

    if db.query(Company).filter(Company.email == payload.company_email).first():
        raise HTTPException(409, "A company with that email already exists")

    if db.query(User).filter(User.email == payload.owner_email).first():
        raise HTTPException(409, "A user with that email already exists")

    company = Company(
        name=payload.company_name, industry=payload.industry,
        email=payload.company_email, address=payload.company_address,
        phone=payload.company_phone,
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    user = User(
        company_id=company.id, name=payload.owner_name, email=payload.owner_email,
        password=hash_password(payload.password), role=payload.role, status="Active",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    audit_service.write_log(db, company.id, user.email, "Company Registered",
                            company.name, ip, browser)
    return {"message": "Company registered successfully", "company_id": company.id}


def _issue_tokens(db: Session, user: User):
    access = create_access_token({"sub": user.email, "role": user.role, "company_id": user.company_id})
    refresh = create_refresh_token({"sub": user.email})
    rt = RefreshToken(
        user_id=user.id, token=refresh,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(rt)
    db.commit()
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer"}


def login(db: Session, payload, ip="", browser=""):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(401, "Invalid email or password")

    user.last_login = datetime.utcnow()
    db.commit()

    audit_service.write_log(db, user.company_id, user.email, "User Login",
                            user.name, ip, browser)
    return _issue_tokens(db, user)


def refresh_access(db: Session, refresh_token: str):
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid refresh token")

    rt = db.query(RefreshToken).filter(RefreshToken.token == refresh_token).first()
    if not rt:
        raise HTTPException(401, "Refresh token not recognized")

    user = db.query(User).filter(User.email == payload["sub"]).first()
    if not user:
        raise HTTPException(401, "User not found")

    access = create_access_token({"sub": user.email, "role": user.role, "company_id": user.company_id})
    return {"access_token": access, "token_type": "bearer"}


def logout(db: Session, user, ip="", browser=""):
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id).delete()
    db.commit()
    audit_service.write_log(db, user.company_id, user.email, "User Logout",
                            user.name, ip, browser)
    return {"message": "Logged out"}


def forgot_password(db: Session, payload, ip="", browser=""):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(400, "Passwords do not match")

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(404, "No account found with that email")

    user.password = hash_password(payload.new_password)
    db.commit()

    audit_service.write_log(db, user.company_id, user.email, "Password Changed",
                            user.name, ip, browser)
    return {"message": "Password reset successfully"}


def change_password(db: Session, user, payload, ip="", browser=""):
    if not verify_password(payload.old_password, user.password):
        raise HTTPException(400, "Old password is incorrect")
    if payload.new_password != payload.confirm_password:
        raise HTTPException(400, "Passwords do not match")

    user.password = hash_password(payload.new_password)
    db.commit()

    audit_service.write_log(db, user.company_id, user.email, "Password Changed",
                            user.name, ip, browser)
    return {"message": "Password changed successfully"}