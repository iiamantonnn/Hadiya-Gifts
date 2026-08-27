import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.config import settings
from app import models
from app.models import COURIER_WINDOWS
from app.ai_service import generate_card_message
from app.schemas import FlowerOut
from app.routers.people import has_accepted_pairing

router = APIRouter(prefix="/api/orders", tags=["orders"])

MIN_LEAD_HOURS = 2
CARD_TYPES = {"none", "physical", "digital", "both"}
RECIPIENT_ADDRESS_TYPES = {"home", "work"}


class CardIn(BaseModel):
    card_type: str = "none"
    text: str | None = None
    ai_generate: bool = False


class CreateOrderIn(BaseModel):
    recipient_person_id: str
    flower_id: str
    size: str | None = None
    color: str | None = None
    occasion: str | None = None
    delivery_date: str
    delivery_window_start: str
    delivery_window_end: str
    address_id: str | None = None
    recipient_address_type: str | None = None
    payment_method_id: str
    is_anonymous: bool = False
    card: CardIn = CardIn()
    wishlist_item_id: str | None = None


def _bookable_windows(for_date: date) -> list[dict]:
    now = datetime.now(timezone.utc)
    today = now.date()
    result = []
    for w in COURIER_WINDOWS:
        window_start_dt = datetime.combine(for_date, datetime.strptime(w["start"], "%H:%M").time(), tzinfo=timezone.utc)
        bookable = for_date > today or (for_date == today and window_start_dt - now >= timedelta(hours=MIN_LEAD_HOURS))
        result.append({**w, "bookable": bookable})
    return result


@router.get("/delivery-windows")
def delivery_windows(for_date: str):
    try:
        parsed = date.fromisoformat(for_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date")
    if parsed < date.today():
        raise HTTPException(status_code=400, detail="Cannot deliver in the past")
    return _bookable_windows(parsed)


@router.post("", status_code=201)
def create_order(payload: CreateOrderIn, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    recipient = db.get(models.Person, payload.recipient_person_id)
    if not recipient or recipient.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Recipient not found")

    flower = db.get(models.Flower, payload.flower_id)
    if not flower or not flower.available:
        raise HTTPException(status_code=400, detail="This item is no longer available")
    if payload.size and payload.size not in (flower.sizes or []):
        raise HTTPException(status_code=400, detail="Invalid size for this item")
    if payload.color and payload.color not in (flower.colors or []):
        raise HTTPException(status_code=400, detail="Invalid color for this item")

    if bool(payload.address_id) == bool(payload.recipient_address_type):
        raise HTTPException(status_code=400, detail="Choose exactly one delivery address")

    if payload.address_id:
        address = db.get(models.Address, payload.address_id)
        if not address or address.user_id != user.id:
            raise HTTPException(status_code=404, detail="Delivery address not found")
    else:
        if payload.recipient_address_type not in RECIPIENT_ADDRESS_TYPES:
            raise HTTPException(status_code=400, detail="Invalid delivery location")
        if not recipient.linked_user_id or not has_accepted_pairing(db, user.id, recipient.linked_user_id):
            raise HTTPException(status_code=403, detail="This recipient hasn't shared a private delivery address with you")
        address = db.query(models.Address).filter(
            models.Address.user_id == recipient.linked_user_id,
            models.Address.address_type == payload.recipient_address_type,
        ).first()
        if not address:
            raise HTTPException(status_code=404, detail="That delivery location isn't available")

    payment_method = db.get(models.PaymentMethod, payload.payment_method_id)
    if not payment_method or payment_method.user_id != user.id:
        raise HTTPException(status_code=404, detail="Payment method not found")

    try:
        delivery_date = date.fromisoformat(payload.delivery_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid delivery date")

    windows = _bookable_windows(delivery_date)
    match = next((w for w in windows if w["start"] == payload.delivery_window_start and w["end"] == payload.delivery_window_end), None)
    if not match or not match["bookable"]:
        raise HTTPException(status_code=400, detail="This delivery time is unavailable. Please choose another window.")

    if payload.card.card_type not in CARD_TYPES:
        raise HTTPException(status_code=400, detail="Invalid card type")

    wishlist_item_id = None
    if payload.wishlist_item_id:
        item = db.get(models.WishlistItem, payload.wishlist_item_id)
        if not item or item.owner_id != user.id:
            raise HTTPException(status_code=404, detail="Wishlist item not found")
        wishlist_item_id = item.id

    order = models.Order(
        buyer_id=user.id,
        recipient_person_id=recipient.id,
        flower_id=flower.id,
        size=payload.size,
        color=payload.color,
        occasion=payload.occasion,
        delivery_date=delivery_date,
        delivery_window_start=payload.delivery_window_start,
        delivery_window_end=payload.delivery_window_end,
        address_id=address.id,
        payment_method_id=payment_method.id,
        is_anonymous=payload.is_anonymous,
        price_cents=flower.price_cents,  # always looked up server-side, never trusted from the client
        status="placed",
        wishlist_item_id=wishlist_item_id,
    )
    db.add(order)
    db.flush()

    card_text = payload.card.text
    ai_generated = False
    if payload.card.card_type != "none":
        if payload.card.ai_generate or not card_text:
            card_text = generate_card_message(payload.occasion, recipient.relationship_type, recipient.name)
            ai_generated = True
        db.add(models.GiftMessage(order_id=order.id, card_type=payload.card.card_type, text=card_text, ai_generated=ai_generated))

    db.add(models.GiftToken(order_id=order.id))
    db.commit()
    db.refresh(order)

    return {"id": order.id, "gift_token": order.gift_token.token}


@router.post("/{order_id}/voice-message", status_code=201)
def upload_voice_message(order_id: str, file: UploadFile = File(...), user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.get(models.Order, order_id)
    if not order or order.buyer_id != user.id:
        raise HTTPException(status_code=404, detail="Order not found")

    allowed_types = {"audio/webm", "audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/x-wav"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Unsupported audio format")

    ext = Path(file.filename or "voice.webm").suffix or ".webm"
    filename = f"{uuid.uuid4().hex}{ext}"
    voice_dir = Path(settings.uploads_dir) / "voice"
    voice_dir.mkdir(parents=True, exist_ok=True)
    dest = voice_dir / filename

    contents = file.file.read(10 * 1024 * 1024 + 1)  # cap at 10MB
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Voice message is too large (max 10MB)")
    dest.write_bytes(contents)

    existing = db.query(models.VoiceMessage).filter(models.VoiceMessage.order_id == order_id).first()
    if existing:
        db.delete(existing)
        db.flush()

    db.add(models.VoiceMessage(order_id=order_id, audio_path=f"/uploads/voice/{filename}"))
    db.commit()
    return {"message": "Voice message saved"}


@router.get("")
def gift_history(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    sent = db.query(models.Order).filter(models.Order.buyer_id == user.id).order_by(models.Order.created_at.desc()).all()

    received_ids = [p.id for p in db.query(models.Person).filter(models.Person.linked_user_id == user.id).all()]
    received = []
    if received_ids:
        received = db.query(models.Order).filter(models.Order.recipient_person_id.in_(received_ids)).order_by(models.Order.created_at.desc()).all()

    def serialize(order: models.Order, viewer_is_buyer: bool) -> dict:
        hide_sender = order.is_anonymous and not viewer_is_buyer
        return {
            "id": order.id,
            "flower": {"id": order.flower.id, "name": order.flower.name, "images": order.flower.images},
            "occasion": order.occasion,
            "status": order.status,
            "delivery_date": order.delivery_date,
            "price_cents": order.price_cents,
            "is_anonymous": order.is_anonymous,
            "sender_name": None if hide_sender else (order.buyer.display_name() if not viewer_is_buyer else None),
            "recipient_name": order.recipient.name if order.recipient else None,
            "message": order.message.text if order.message else None,
            "has_voice_message": order.voice_message is not None,
            "wishlist_gift": {
                "id": order.wishlist_gift.id,
                "product_name": order.wishlist_gift.product_name,
                "image_url": order.wishlist_gift.image_url,
            } if order.wishlist_gift else None,
            "created_at": order.created_at,
        }

    return {
        "sent": [serialize(o, True) for o in sent],
        "received": [serialize(o, False) for o in received],
    }


@router.get("/{order_id}")
def get_order(order_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.get(models.Order, order_id)
    is_buyer = order is not None and order.buyer_id == user.id
    is_recipient = order is not None and order.recipient is not None and order.recipient.linked_user_id == user.id
    if not order or not (is_buyer or is_recipient):
        raise HTTPException(status_code=404, detail="Order not found")

    return {
        "id": order.id,
        "direction": "sent" if is_buyer else "received",
        "flower": FlowerOut.model_validate(order.flower),
        "sender_name": None if (order.is_anonymous and not is_buyer) else (None if is_buyer else order.buyer.display_name()),
        "recipient_name": order.recipient.name if order.recipient else None,
        "occasion": order.occasion,
        "delivery_date": order.delivery_date,
        "delivery_window_start": order.delivery_window_start,
        "delivery_window_end": order.delivery_window_end,
        "is_anonymous": order.is_anonymous,
        "status": order.status,
        "price_cents": order.price_cents,
        "card": {
            "card_type": order.message.card_type, "text": order.message.text, "ai_generated": order.message.ai_generated,
        } if order.message else None,
        "voice_message_url": order.voice_message.audio_path if order.voice_message else None,
        "payment_method": {
            "method_type": order.payment_method.method_type,
            "brand": order.payment_method.brand,
            "last4": order.payment_method.last4,
        } if is_buyer else None,
        "wishlist_gift": {
            "id": order.wishlist_gift.id,
            "product_name": order.wishlist_gift.product_name,
            "image_url": order.wishlist_gift.image_url,
            "marketplace": order.wishlist_gift.marketplace,
            "notes": order.wishlist_gift.notes,
        } if order.wishlist_gift else None,
        "gift_token": order.gift_token.token if (order.gift_token and is_buyer) else None,
    }
