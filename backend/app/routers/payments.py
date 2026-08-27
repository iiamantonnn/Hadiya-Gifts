from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app import models
from app.schemas import PaymentMethodOut

router = APIRouter(prefix="/api/payment-methods", tags=["payments"])

METHOD_TYPES = {"card", "google_pay", "apple_pay"}
CARD_BRANDS = {"visa", "mastercard", "amex", "other"}


class PaymentMethodIn(BaseModel):
    # Demo-mode tokenization: this schema has no field for a full card
    # number or CVV, so the backend can never receive - let alone store -
    # either one. The client reduces a card to brand + last4 before this
    # ever reaches the network.
    method_type: str
    brand: str | None = None
    last4: str | None = None
    exp_month: int | None = None
    exp_year: int | None = None
    is_default: bool = False


@router.get("", response_model=list[PaymentMethodOut])
def list_payment_methods(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.PaymentMethod).filter(models.PaymentMethod.user_id == user.id).all()


@router.post("", status_code=201, response_model=PaymentMethodOut)
def create_payment_method(payload: PaymentMethodIn, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.method_type not in METHOD_TYPES:
        raise HTTPException(status_code=400, detail="Invalid payment method type")
    if payload.method_type == "card":
        if payload.brand not in CARD_BRANDS or not payload.last4 or len(payload.last4) != 4 or not payload.last4.isdigit():
            raise HTTPException(status_code=400, detail="Invalid card details")

    if payload.is_default:
        db.query(models.PaymentMethod).filter(models.PaymentMethod.user_id == user.id).update({"is_default": False})

    row = models.PaymentMethod(
        user_id=user.id,
        method_type=payload.method_type,
        brand=payload.brand if payload.method_type == "card" else None,
        last4=payload.last4 if payload.method_type == "card" else None,
        exp_month=payload.exp_month if payload.method_type == "card" else None,
        exp_year=payload.exp_year if payload.method_type == "card" else None,
        is_default=payload.is_default,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{payment_method_id}")
def delete_payment_method(payment_method_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.get(models.PaymentMethod, payment_method_id)
    if not row or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Payment method not found")
    db.delete(row)
    db.commit()
    return {"message": "Payment method removed"}
