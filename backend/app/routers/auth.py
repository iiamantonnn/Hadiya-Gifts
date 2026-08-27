from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, Request
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.email_service import send_email
from app import models
from app.security import (
    hash_secret,
    verify_secret,
    create_access_token,
    generate_raw_token,
    generate_verification_code,
    is_expired,
)
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])

VERIFICATION_CODE_TTL_MINUTES = 10
RESET_TOKEN_TTL_MINUTES = 60
MAX_CODE_ATTEMPTS = 5


# ---------- schemas ----------

class RegisterIn(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None = None
    date_of_birth: str | None = None  # ISO date, optional
    password: str
    confirm_password: str
    username: str | None = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info):
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v


class VerifyEmailIn(BaseModel):
    email: EmailStr
    code: str


class ResendCodeIn(BaseModel):
    email: EmailStr


class LoginIn(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info):
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match")
        return v


class UserOut(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    preferred_name: str | None
    username: str | None
    profile_photo_url: str | None
    email_verified: bool
    locale: str

    model_config = {"from_attributes": True}


# ---------- helpers ----------

def _issue_session(response: Response, db: Session, user: models.User, remember_me: bool) -> None:
    access_token = create_access_token(user.id)

    raw_refresh = generate_raw_token()
    days = settings.refresh_token_days_remember_me if remember_me else settings.refresh_token_days_default
    expires_at = datetime.now(timezone.utc) + timedelta(days=days)
    db.add(models.RefreshToken(user_id=user.id, token_hash=hash_secret(raw_refresh), expires_at=expires_at))
    db.commit()

    is_prod = settings.frontend_url.startswith("https")
    response.set_cookie(
        "access_token", access_token, httponly=True, samesite="lax",
        secure=is_prod, max_age=settings.access_token_minutes * 60, path="/",
    )
    response.set_cookie(
        "refresh_token", raw_refresh, httponly=True, samesite="lax", secure=is_prod,
        max_age=days * 24 * 3600 if remember_me else None, path="/api/auth",
    )


def _find_refresh_token(db: Session, raw_token: str) -> models.RefreshToken | None:
    # token_hash is a bcrypt hash (salted), so we must check candidates by
    # comparing against each non-revoked, non-expired row.
    now = datetime.now(timezone.utc)
    candidates = db.query(models.RefreshToken).filter(
        models.RefreshToken.revoked.is_(False),
        models.RefreshToken.expires_at > now,
    ).all()
    for candidate in candidates:
        if verify_secret(raw_token, candidate.token_hash):
            return candidate
    return None


# ---------- routes ----------

@router.post("/register", status_code=201)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    dob = None
    if payload.date_of_birth:
        try:
            dob = datetime.strptime(payload.date_of_birth, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date of birth")

    user = models.User(
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        email=str(payload.email).lower(),
        phone=payload.phone,
        date_of_birth=dob,
        password_hash=hash_secret(payload.password),
        username=payload.username,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    _send_verification_code(db, user)

    return {"user_id": user.id, "email": user.email}


def _send_verification_code(db: Session, user: models.User) -> None:
    code = generate_verification_code()
    db.add(models.EmailVerificationCode(
        user_id=user.id,
        code_hash=hash_secret(code),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=VERIFICATION_CODE_TTL_MINUTES),
    ))
    db.commit()
    send_email(user.email, "Verify your Hadiya account",
               f"Your verification code is {code}. It expires in {VERIFICATION_CODE_TTL_MINUTES} minutes.")


@router.post("/resend-code")
def resend_code(payload: ResendCodeIn, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if user and not user.email_verified:
        _send_verification_code(db, user)
    # Same response whether or not the account exists - don't leak that.
    return {"message": "If an account exists, a new code has been sent"}


@router.post("/verify-email")
def verify_email(payload: VerifyEmailIn, response: Response, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or code")
    if user.email_verified:
        raise HTTPException(status_code=400, detail="This account is already verified")

    code_row = (
        db.query(models.EmailVerificationCode)
        .filter(models.EmailVerificationCode.user_id == user.id, models.EmailVerificationCode.consumed.is_(False))
        .order_by(models.EmailVerificationCode.created_at.desc())
        .first()
    )
    if not code_row or is_expired(code_row.expires_at):
        raise HTTPException(status_code=400, detail="This code has expired. Request a new one.")
    if code_row.attempts >= MAX_CODE_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many attempts. Request a new code.")

    if not verify_secret(payload.code, code_row.code_hash):
        code_row.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Incorrect code")

    code_row.consumed = True
    user.email_verified = True
    db.commit()

    _issue_session(response, db, user, remember_me=False)
    return UserOut.model_validate(user)


@router.post("/login")
def login(payload: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == str(payload.email).lower()).first()
    generic_error = "Incorrect email or password"
    if not user or not verify_secret(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail=generic_error)
    if not user.email_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before signing in")

    _issue_session(response, db, user, payload.remember_me)
    return UserOut.model_validate(user)


@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_token = request.cookies.get("refresh_token")
    if not raw_token:
        raise HTTPException(status_code=401, detail="Not signed in")

    token_row = _find_refresh_token(db, raw_token)
    if not token_row:
        raise HTTPException(status_code=401, detail="Session expired, please sign in again")

    user = db.get(models.User, token_row.user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Account not found")

    token_row.revoked = True
    was_remember_me = (token_row.expires_at - token_row.created_at) > timedelta(days=settings.refresh_token_days_default)
    db.commit()

    _issue_session(response, db, user, remember_me=was_remember_me)
    return UserOut.model_validate(user)


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_token = request.cookies.get("refresh_token")
    if raw_token:
        token_row = _find_refresh_token(db, raw_token)
        if token_row:
            token_row.revoked = True
            db.commit()
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/auth")
    return {"message": "Signed out"}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordIn, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == str(payload.email).lower()).first()
    if user:
        raw_token = generate_raw_token()
        db.add(models.PasswordResetToken(
            user_id=user.id,
            token_hash=hash_secret(raw_token),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_TTL_MINUTES),
        ))
        db.commit()
        reset_url = f"{settings.frontend_url}/reset-password?token={raw_token}"
        send_email(user.email, "Reset your Hadiya password", f"Reset your password: {reset_url}")
    # Always the same response - don't reveal whether the email is registered.
    return {"message": "If an account exists, a reset link has been sent"}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordIn, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    candidates = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.used.is_(False),
        models.PasswordResetToken.expires_at > now,
    ).all()
    match = next((c for c in candidates if verify_secret(payload.token, c.token_hash)), None)
    if not match:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired")

    user = db.get(models.User, match.user_id)
    user.password_hash = hash_secret(payload.new_password)
    match.used = True
    # Sign out everywhere on password reset.
    for rt in db.query(models.RefreshToken).filter(models.RefreshToken.user_id == user.id, models.RefreshToken.revoked.is_(False)):
        rt.revoked = True
    db.commit()
    return {"message": "Password updated. Please sign in."}


@router.get("/me")
def me(user: models.User = Depends(get_current_user)):
    return UserOut.model_validate(user)
