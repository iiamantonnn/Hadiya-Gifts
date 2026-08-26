from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.schemas import FlowerOut

router = APIRouter(prefix="/api/flowers", tags=["catalog"])

FLOWER_TYPES = ["roses", "tulips", "peonies", "lilies", "mixed", "seasonal", "other"]
COLORS = ["red", "white", "pink", "yellow", "purple", "blue", "mixed", "other"]
SIZES = ["small", "medium", "large"]
OCCASIONS = ["birthday", "anniversary", "friendship", "thank_you", "congratulations", "romantic", "sympathy", "just_because", "other"]
RELATIONSHIPS = ["mother", "father", "partner", "friend", "colleague", "grandparent", "sibling", "other"]


@router.get("/options")
def filter_options():
    return {
        "flower_types": FLOWER_TYPES, "colors": COLORS, "sizes": SIZES,
        "occasions": OCCASIONS, "relationships": RELATIONSHIPS,
    }


@router.get("", response_model=list[FlowerOut])
def search_flowers(
    q: str | None = Query(None),
    flower_type: str | None = None,
    color: str | None = None,
    occasion: str | None = None,
    relationship: str | None = None,
    size: str | None = None,
    min_price: int | None = Query(None, description="cents"),
    max_price: int | None = Query(None, description="cents"),
    db: Session = Depends(get_db),
):
    query = db.query(models.Flower).filter(models.Flower.available.is_(True))

    if q:
        like = f"%{q.lower()}%"
        query = query.filter(
            (models.Flower.name.ilike(like)) | (models.Flower.description.ilike(like))
        )
    if flower_type:
        query = query.filter(models.Flower.flower_type == flower_type)
    if min_price is not None:
        query = query.filter(models.Flower.price_cents >= min_price)
    if max_price is not None:
        query = query.filter(models.Flower.price_cents <= max_price)

    results = query.order_by(models.Flower.name).all()

    # JSON-array filters (color/occasion/relationship/size) are applied in
    # Python - portable across SQLite and Postgres without a JSON-specific
    # query dialect, and the catalog is small enough that this is cheap.
    def matches(flower: models.Flower) -> bool:
        if color and color not in (flower.colors or []):
            return False
        if occasion and occasion not in (flower.occasions or []):
            return False
        if relationship and relationship not in (flower.recommended_relationships or []):
            return False
        if size and size not in (flower.sizes or []):
            return False
        return True

    return [f for f in results if matches(f)]


@router.get("/{flower_id}", response_model=FlowerOut)
def get_flower(flower_id: str, db: Session = Depends(get_db)):
    flower = db.get(models.Flower, flower_id)
    if not flower or not flower.available:
        raise HTTPException(status_code=404, detail="This item is no longer available")
    return flower
