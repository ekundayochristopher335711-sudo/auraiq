import random
import string
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from jose import JWTError, jwt

from app.core.config import settings
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, decode_token
from app.models.user import User
from app.models.otp import OTPCode
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.services.email import send_otp_email

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ── Helpers ────────────────────────────────────────────────────────────────────

def _decode_supabase_token(token: str) -> Optional[dict]:
    if not settings.SUPABASE_JWT_SECRET:
        return None
    try:
        return jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"])
    except JWTError:
        return None


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = None
    try:
        payload = decode_token(token)
        user_id: int = int(payload.get("sub"))
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            return user
    except Exception:
        pass

    payload = _decode_supabase_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        metadata = payload.get("user_metadata") or {}
        full_name = metadata.get("full_name") or email.split("@")[0]
        user = User(
            email=email,
            full_name=full_name,
            hashed_password="",
            email_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


def _create_otp(db: Session, email: str, purpose: str) -> str:
    db.query(OTPCode).filter(OTPCode.email == email, OTPCode.purpose == purpose).delete()
    code = _generate_otp()
    db.add(OTPCode(
        email=email,
        code=code,
        purpose=purpose,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    ))
    db.commit()
    return code


# ── Schemas ─────────────────────────────────────────────────────────────────────

class VerifyOTPRequest(BaseModel):
    email: str
    code: str
    purpose: str   # "verify_email" | "reset_password"

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str

class ResendOTPRequest(BaseModel):
    email: str
    purpose: str


# ── Routes ──────────────────────────────────────────────────────────────────────

@router.post("/register", status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
        email_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "email": body.email}


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.email_verified:
        code = _create_otp(db, body.email, "verify_email")
        send_otp_email(body.email, code, "verify_email")
        raise HTTPException(
            status_code=403,
            detail="email_not_verified"
        )

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/verify-otp")
def verify_otp(body: VerifyOTPRequest, db: Session = Depends(get_db)):
    otp = db.query(OTPCode).filter(
        OTPCode.email == body.email,
        OTPCode.code == body.code,
        OTPCode.purpose == body.purpose,
        OTPCode.used == False,
        OTPCode.expires_at > datetime.utcnow(),
    ).first()

    if not otp:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    otp.used = True

    if body.purpose == "verify_email":
        user = db.query(User).filter(User.email == body.email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        user.email_verified = True
        db.commit()
        token = create_access_token({"sub": str(user.id)})
        return {"access_token": token, "token_type": "bearer"}

    # reset_password — OTP verified; client calls /reset-password next
    db.commit()
    return {"message": "Code verified", "verified": True}


@router.post("/resend-otp", status_code=200)
def resend_otp(body: ResendOTPRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        return {"message": "If that email exists, a code has been sent."}
    code = _create_otp(db, body.email, body.purpose)
    send_otp_email(body.email, code, body.purpose)
    return {"message": "Code resent"}


@router.post("/forgot-password", status_code=200)
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        return {"message": "If that email exists, a reset code has been sent."}
    code = _create_otp(db, body.email, "reset_password")
    send_otp_email(body.email, code, "reset_password")
    return {"message": "Reset code sent to your email"}


@router.post("/reset-password", status_code=200)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    otp = db.query(OTPCode).filter(
        OTPCode.email == body.email,
        OTPCode.code == body.code,
        OTPCode.purpose == "reset_password",
        OTPCode.used == False,
        OTPCode.expires_at > datetime.utcnow(),
    ).first()

    if not otp:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(body.new_password)
    otp.used = True
    db.commit()

    return {"message": "Password reset successfully"}
