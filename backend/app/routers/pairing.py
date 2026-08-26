from datetime import datetime, timezone

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app import models

router = APIRouter(prefix="/api/pairing", tags=["pairing"])


class PairingRequestIn(BaseModel):
    recipient_email: str


def _visible(p: models.Pairing, user_id: str) -> dict:
    return {
        "id": p.id, "status": p.status, "created_at": p.created_at,
        "direction": "outgoing" if p.requester_id == user_id else "incoming",
        "other_user_id": p.recipient_id if p.requester_id == user_id else p.requester_id,
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


@router.post("/{pairing_id}/accept")
def accept_pairing(pairing_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _get_pairing_for(db, pairing_id, user.id)
    if row.recipient_id != user.id:
        raise HTTPException(status_code=403, detail="Only the recipient can accept this request")
    row.status = "accepted"
    row.responded_at = datetime.now(timezone.utc)
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
