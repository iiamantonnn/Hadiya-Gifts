from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models

router = APIRouter(prefix="/api/gift", tags=["gift-page"])


@router.get("/{token}")
def public_gift_page(token: str, db: Session = Depends(get_db)):
    """Public - reachable only by an unguessable token (QR/NFC), never by
    order id. Only ever returns what the recipient is meant to see: never
    the delivery address, buyer email/phone, or anything beyond what this
    endpoint explicitly selects."""
    gift_token = db.query(models.GiftToken).filter(models.GiftToken.token == token).first()
    if not gift_token:
        raise HTTPException(status_code=404, detail="This gift page could not be found")

    order = gift_token.order
    flower = order.flower

    return {
        "flower": {
            "name": flower.name,
            "images": flower.images,
            "care_instructions": flower.care_instructions,
            "water_instructions": flower.water_instructions,
            "stem_instructions": flower.stem_instructions,
            "placement_instructions": flower.placement_instructions,
            "avoid_notes": flower.avoid_notes,
            "estimated_lifespan_text": flower.estimated_lifespan_text,
        },
        "occasion": order.occasion,
        "sender_name": None if order.is_anonymous else order.buyer.display_name(),
        "message": order.message.text if order.message and order.message.card_type in ("digital", "both") else None,
        "voice_message_url": order.voice_message.audio_path if order.voice_message else None,
        "status": order.status,
    }
