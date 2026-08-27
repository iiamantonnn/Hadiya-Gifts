from datetime import datetime, timedelta, timezone

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.config import settings
from app import models
from app.routers.people import RELATIONSHIP_TYPES
from app.security import is_expired

router = APIRouter(prefix="/api/pairing", tags=["pairing"])

INVITATION_TTL_HOURS = 72
INVITATION_THEMES = {"minimal", "elegant", "heart", "birthday", "anniversary", "valentine", "christmas", "seasonal"}


class PairingRequestIn(BaseModel):
    recipient_email: str


class CreateInvitationIn(BaseModel):
    theme: str = "minimal"


class AcceptInvitationIn(BaseModel):
    relationship_type: str


def _visible(p: models.Pairing, user_id: str) -> dict:
    is_requester = p.requester_id == user_id
    other = p.recipient if is_requester else p.requester
    return {
        "id": p.id, "status": p.status, "created_at": p.created_at,
        "direction": "outgoing" if is_requester else "incoming",
        "other_user_id": other.id,
        "other_user_name": other.display_name(),
    }


@router.get("")
def list_pairings(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(models.Pairing).filter(
        (models.Pairing.requester_id == user.id) | (models.Pairing.recipient_id == user.id)
    ).all()
    return [_visible(p, user.id) for p in rows]


@router.post("/request", status_code=201)
def request_pairing(payload: PairingRequestIn, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    target = db.query(models.User).filter(models.User.email == payload.recipient_email.lower()).first()
    if not target:
        raise HTTPException(status_code=404, detail="No Hadiya account found with that email")
    if target.id == user.id:
        raise HTTPException(status_code=400, detail="You can't pair with yourself")

    existing = db.query(models.Pairing).filter(
        models.Pairing.status.in_(["pending", "accepted"]),
        ((models.Pairing.requester_id == user.id) & (models.Pairing.recipient_id == target.id))
        | ((models.Pairing.requester_id == target.id) & (models.Pairing.recipient_id == user.id)),
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="A pairing already exists with this person")

    row = models.Pairing(requester_id=user.id, recipient_id=target.id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _visible(row, user.id)


def _get_pairing_for(db: Session, pairing_id: str, user_id: str) -> models.Pairing:
    row = db.get(models.Pairing, pairing_id)
    if not row or user_id not in (row.requester_id, row.recipient_id):
        raise HTTPException(status_code=404, detail="Pairing not found")
    return row


def _link_person(db: Session, owner: models.User, other: models.User, relationship_type: str = "other") -> None:
    """Make `other` reachable as a My People contact for `owner`, so the
    pairing is actually usable at checkout (e.g. the recipient-private-
    address option) instead of only linkable by hand in seed data."""
    existing = db.query(models.Person).filter(
        models.Person.owner_id == owner.id, models.Person.linked_user_id == other.id,
    ).first()
    if existing:
        return
    db.add(models.Person(
        owner_id=owner.id, name=other.display_name(), relationship_type=relationship_type,
        linked_user_id=other.id,
    ))


@router.post("/{pairing_id}/accept")
def accept_pairing(pairing_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _get_pairing_for(db, pairing_id, user.id)
    if row.recipient_id != user.id:
        raise HTTPException(status_code=403, detail="Only the recipient can accept this request")
    row.status = "accepted"
    row.responded_at = datetime.now(timezone.utc)

    requester = db.get(models.User, row.requester_id)
    recipient = db.get(models.User, row.recipient_id)
    _link_person(db, requester, recipient)
    _link_person(db, recipient, requester)

    db.commit()
    return _visible(row, user.id)


@router.post("/{pairing_id}/decline")
def decline_pairing(pairing_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _get_pairing_for(db, pairing_id, user.id)
    if row.recipient_id != user.id:
        raise HTTPException(status_code=403, detail="Only the recipient can decline this request")
    row.status = "declined"
    row.responded_at = datetime.now(timezone.utc)
    db.commit()
    return _visible(row, user.id)


@router.post("/{pairing_id}/end")
def end_pairing(pairing_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Relationship reset. MVP scope: marks the pairing ended and stops
    sharing new data - it does not retroactively delete past gift history
    on either side, since that's each user's own record of what they sent
    or received, not the pairing's to erase unilaterally."""
    row = _get_pairing_for(db, pairing_id, user.id)
    row.status = "ended"
    db.commit()
    return _visible(row, user.id)


def _invitation_share_url(token: str) -> str:
    return f"{settings.frontend_url}/pair/{token}"


def _invitation_out(row: models.PairingInvitation) -> dict:
    return {"token": row.token, "theme": row.theme, "expires_at": row.expires_at, "share_url": _invitation_share_url(row.token)}


@router.post("/invitations", status_code=201)
def create_invitation(payload: CreateInvitationIn, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.theme not in INVITATION_THEMES:
        raise HTTPException(status_code=400, detail="Invalid theme")
    row = models.PairingInvitation(
        creator_id=user.id, theme=payload.theme,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=INVITATION_TTL_HOURS),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _invitation_out(row)


@router.get("/invitations/{token}")
def get_invitation(token: str, db: Session = Depends(get_db)):
    """Public preview, reachable via the QR/link before the viewer logs in.
    Exposes only the creator's display name and chosen theme - never their
    email, id, or any other private field."""
    row = db.query(models.PairingInvitation).filter(models.PairingInvitation.token == token).first()
    if not row:
        raise HTTPException(status_code=404, detail="This invitation could not be found")
    if row.used:
        return {"valid": False, "reason": "used"}
    if is_expired(row.expires_at):
        return {"valid": False, "reason": "expired"}
    return {"valid": True, "creator_name": row.creator.display_name(), "theme": row.theme}


@router.post("/invitations/{token}/accept")
def accept_invitation(token: str, payload: AcceptInvitationIn, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.relationship_type not in RELATIONSHIP_TYPES:
        raise HTTPException(status_code=400, detail="Invalid relationship type")

    row = db.query(models.PairingInvitation).filter(models.PairingInvitation.token == token).first()
    if not row:
        raise HTTPException(status_code=404, detail="This invitation could not be found")
    if row.used:
        raise HTTPException(status_code=400, detail="This invitation has already been used")
    if is_expired(row.expires_at):
        raise HTTPException(status_code=400, detail="This invitation has expired")
    if row.creator_id == user.id:
        raise HTTPException(status_code=400, detail="You can't pair with yourself")

    existing = db.query(models.Pairing).filter(
        models.Pairing.status == "accepted",
        ((models.Pairing.requester_id == row.creator_id) & (models.Pairing.recipient_id == user.id))
        | ((models.Pairing.requester_id == user.id) & (models.Pairing.recipient_id == row.creator_id)),
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You're already paired with this person")

    creator = db.get(models.User, row.creator_id)
    pairing = models.Pairing(requester_id=creator.id, recipient_id=user.id, status="accepted", responded_at=datetime.now(timezone.utc))
    db.add(pairing)

    row.used = True
    row.used_by_id = user.id

    _link_person(db, creator, user)                              # creator's side - editable later from My People
    _link_person(db, user, creator, payload.relationship_type)   # acceptor's own choice, right now

    db.commit()
    db.refresh(pairing)
    return _visible(pairing, user.id)
