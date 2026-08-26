from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app import models
from app.schemas import AddressOut

router = APIRouter(prefix="/api/users", tags=["users"])

VALID_DOB_VISIBILITY = {"only_me", "paired", "selected", "everyone"}


class UpdateProfileIn(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    preferred_name: str | None = None
    phone: str | None = None
    username: str | None = None
    profile_photo_url: str | None = None


class UpdatePrivacyIn(BaseModel):
    dob_visibility: str


class AddressIn(BaseModel):
    label: str
    line1: str
    line2: str | None = None
    city: str
    region: str | None = None
    postal_code: str | None = None
    country: str
    is_default: bool = False


@router.patch("/me")
def update_profile(payload: UpdateProfileIn, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    return {"message": "Profile updated"}


@router.patch("/me/privacy")
def update_privacy(payload: UpdatePrivacyIn, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.dob_visibility not in VALID_DOB_VISIBILITY:
        raise HTTPException(status_code=400, detail="Invalid privacy option")
    user.dob_visibility = payload.dob_visibility
    db.commit()
    return {"message": "Privacy settings updated"}


@router.get("/me/addresses", response_model=list[AddressOut])
def list_addresses(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(models.Address).filter(models.Address.user_id == user.id).all()
    return rows


@router.post("/me/addresses", status_code=201, response_model=AddressOut)
def create_address(payload: AddressIn, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.is_default:
        db.query(models.Address).filter(models.Address.user_id == user.id).update({"is_default": False})
    row = models.Address(user_id=user.id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/me/addresses/{address_id}", response_model=AddressOut)
def update_address(address_id: str, payload: AddressIn, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.get(models.Address, address_id)
    if not row or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Address not found")
    if payload.is_default:
        db.query(models.Address).filter(models.Address.user_id == user.id).update({"is_default": False})
    for field, value in payload.model_dump().items():
        setattr(row, field, value)
    db.commit()
    return row


@router.delete("/me/addresses/{address_id}")
def delete_address(address_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.get(models.Address, address_id)
    if not row or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Address not found")
    db.delete(row)
    db.commit()
    return {"message": "Address removed"}
