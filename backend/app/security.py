import secrets
import string
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt, JWTError

from app.config import settings


def hash_secret(raw: str) -> str:
    return bcrypt.hashpw(raw.encode(), bcrypt.gensalt()).decode()


def verify_secret(raw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(raw.encode(), hashed.encode())
    except ValueError:
        return False


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)
    payload = {"sub": user_id, "exp": expire, "type": "access"}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
    if payload.get("type") != "access":
        return None
    return payload.get("sub")


def generate_raw_token(length: int = 48) -> str:
    return secrets.token_urlsafe(length)


def generate_verification_code() -> str:
    return "".join(secrets.choice(string.digits) for _ in range(6))


def is_expired(expires_at: datetime) -> bool:
    # SQLite drops tzinfo on round-trip even for a DateTime(timezone=True)
    # column, so a naive value read back here still means UTC - comparing
    # it directly against an aware "now" raises TypeError.
    aware = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=timezone.utc)
    return aware < datetime.now(timezone.utc)
