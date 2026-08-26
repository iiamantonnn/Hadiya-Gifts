import re

import httpx
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app import models
from app.schemas import WishlistItemOut

router = APIRouter(prefix="/api/wishlist", tags=["wishlist"])


class WishlistItemIn(BaseModel):
    person_id: str | None = None
    product_name: str
    marketplace: str | None = None
    url: str | None = None
    sku: str | None = None
    model: str | None = None
    size: str | None = None
    color: str | None = None
    material: str | None = None
    image_url: str | None = None
    notes: str | None = None


class ExtractUrlIn(BaseModel):
    url: str


@router.get("", response_model=list[WishlistItemOut])
def list_wishlist(person_id: str | None = None, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(models.WishlistItem).filter(models.WishlistItem.owner_id == user.id)
    if person_id:
        query = query.filter(models.WishlistItem.person_id == person_id)
    return query.order_by(models.WishlistItem.created_at.desc()).all()


@router.post("", status_code=201, response_model=WishlistItemOut)
def create_wishlist_item(payload: WishlistItemIn, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.person_id:
        person = db.get(models.Person, payload.person_id)
        if not person or person.owner_id != user.id:
            raise HTTPException(status_code=404, detail="Person not found")
    row = models.WishlistItem(owner_id=user.id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{item_id}")
def delete_wishlist_item(item_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.get(models.WishlistItem, item_id)
    if not row or row.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Wishlist item not found")
    db.delete(row)
    db.commit()
    return {"message": "Removed from wishlist"}


@router.post("/extract-url")
def extract_url_metadata(payload: ExtractUrlIn, user: models.User = Depends(get_current_user)):
    """Best-effort metadata extraction. Never blocks adding an item manually
    if this fails - the frontend falls back to a blank form."""
    if not payload.url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Enter a valid URL")

    try:
        resp = httpx.get(payload.url, timeout=5.0, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0 HadiyaBot/1.0"})
        html = resp.text[:200_000]
    except httpx.HTTPError:
        return {"product_name": None, "image_url": None, "extracted": False}

    def _meta(prop: str) -> str | None:
        match = re.search(
            rf'<meta[^>]+(?:property|name)=["\']{re.escape(prop)}["\'][^>]+content=["\']([^"\']+)["\']',
            html, re.IGNORECASE,
        )
        return match.group(1) if match else None

    title = _meta("og:title")
    if not title:
        title_match = re.search(r"<title[^>]*>([^<]+)</title>", html, re.IGNORECASE)
        title = title_match.group(1).strip() if title_match else None

    image = _meta("og:image")

    return {"product_name": title, "image_url": image, "extracted": bool(title or image)}
