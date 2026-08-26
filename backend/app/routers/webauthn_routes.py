from datetime import datetime, timedelta, timezone

import webauthn
from webauthn.helpers import bytes_to_base64url, base64url_to_bytes
from webauthn.helpers.structs import (
    PublicKeyCredentialDescriptor,
    AuthenticatorSelectionCriteria,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)
from fastapi import APIRouter, Depends, HTTPException, Response, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app import models
from app.routers.auth import _issue_session, UserOut

router = APIRouter(prefix="/api/webauthn", tags=["webauthn"])

CHALLENGE_TTL_MINUTES = 5


class NicknameIn(BaseModel):
    nickname: str | None = None


def _store_challenge(db: Session, challenge_bytes: bytes, purpose: str, user_id: str | None) -> str:
    row = models.WebAuthnChallenge(
        user_id=user_id,
        challenge=bytes_to_base64url(challenge_bytes),
        purpose=purpose,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=CHALLENGE_TTL_MINUTES),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row.id


def _consume_challenge(db: Session, challenge_id: str, purpose: str) -> models.WebAuthnChallenge:
    row = db.get(models.WebAuthnChallenge, challenge_id)
    if not row or row.purpose != purpose or row.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This request has expired. Please try again.")
    db.delete(row)
    db.commit()
    return row


@router.get("/passkeys")
def list_passkeys(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(models.Passkey).filter(models.Passkey.user_id == user.id).all()
    return [{"id": p.id, "nickname": p.nickname, "created_at": p.created_at} for p in rows]


@router.delete("/passkeys/{passkey_id}")
def delete_passkey(passkey_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.get(models.Passkey, passkey_id)
    if not row or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Passkey not found")
    db.delete(row)
    db.commit()
    return {"message": "Passkey removed"}


@router.post("/register/options")
def register_options(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(models.Passkey).filter(models.Passkey.user_id == user.id).all()
    options = webauthn.generate_registration_options(
        rp_id=settings.webauthn_rp_id,
        rp_name=settings.webauthn_rp_name,
        user_id=user.id.encode(),
        user_name=user.email,
        user_display_name=user.display_name(),
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
        exclude_credentials=[
            PublicKeyCredentialDescriptor(id=base64url_to_bytes(p.credential_id)) for p in existing
        ],
    )
    challenge_id = _store_challenge(db, options.challenge, "register", user.id)
    return {"options": webauthn.options_to_json(options), "challenge_id": challenge_id}


@router.post("/register/verify")
def register_verify(
    challenge_id: str = Body(...),
    credential: dict = Body(...),
    nickname: str | None = Body(None),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    challenge_row = _consume_challenge(db, challenge_id, "register")
    if challenge_row.user_id != user.id:
        raise HTTPException(status_code=400, detail="This request does not belong to you")

    try:
        verification = webauthn.verify_registration_response(
            credential=credential,
            expected_challenge=base64url_to_bytes(challenge_row.challenge),
            expected_rp_id=settings.webauthn_rp_id,
            expected_origin=settings.webauthn_origin,
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Could not verify this passkey. Please try again.")

    db.add(models.Passkey(
        user_id=user.id,
        credential_id=bytes_to_base64url(verification.credential_id),
        public_key=bytes_to_base64url(verification.credential_public_key),
        sign_count=verification.sign_count,
        nickname=nickname,
    ))
    db.commit()
    return {"message": "Passkey added"}


@router.post("/login/options")
def login_options(email: str | None = Body(None, embed=True), db: Session = Depends(get_db)):
    allow_credentials = None
    if email:
        target_user = db.query(models.User).filter(models.User.email == email.lower()).first()
        if target_user:
            passkeys = db.query(models.Passkey).filter(models.Passkey.user_id == target_user.id).all()
            allow_credentials = [PublicKeyCredentialDescriptor(id=base64url_to_bytes(p.credential_id)) for p in passkeys]

    options = webauthn.generate_authentication_options(
        rp_id=settings.webauthn_rp_id,
        allow_credentials=allow_credentials,
        user_verification=UserVerificationRequirement.PREFERRED,
    )
    challenge_id = _store_challenge(db, options.challenge, "login", None)
    return {"options": webauthn.options_to_json(options), "challenge_id": challenge_id}


@router.post("/login/verify")
def login_verify(
    response: Response,
    challenge_id: str = Body(...),
    credential: dict = Body(...),
    db: Session = Depends(get_db),
):
    challenge_row = _consume_challenge(db, challenge_id, "login")

    credential_id = credential.get("id")
    passkey = db.query(models.Passkey).filter(models.Passkey.credential_id == credential_id).first()
    if not passkey:
        raise HTTPException(status_code=400, detail="This passkey is not recognized")

    try:
        verification = webauthn.verify_authentication_response(
            credential=credential,
            expected_challenge=base64url_to_bytes(challenge_row.challenge),
            expected_rp_id=settings.webauthn_rp_id,
            expected_origin=settings.webauthn_origin,
            credential_public_key=base64url_to_bytes(passkey.public_key),
            credential_current_sign_count=passkey.sign_count,
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Could not verify this passkey. Please try again.")

    passkey.sign_count = verification.new_sign_count
    db.commit()

    user = db.get(models.User, passkey.user_id)
    _issue_session(response, db, user, remember_me=True)
    return UserOut.model_validate(user)
