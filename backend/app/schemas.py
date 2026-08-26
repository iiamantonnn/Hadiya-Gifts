"""Pydantic output schemas. FastAPI cannot safely JSON-encode a raw
SQLAlchemy ORM instance (it falls back to vars(obj), which includes the
non-serializable _sa_instance_state) - every endpoint that returns model
data needs to go through one of these, either via `response_model=` or by
calling `.model_validate(...)` explicitly before returning."""
from datetime import date, datetime

from pydantic import BaseModel, field_validator


def _none_to_empty_list(v):
    return v if v is not None else []


class FlowerOut(BaseModel):
    id: str
    name: str
    description: str
    price_cents: int
    images: list[str]
    flower_type: str
    colors: list[str]
    sizes: list[str]
    occasions: list[str]
    recommended_relationships: list[str]
    available: bool
    care_instructions: str
    water_instructions: str
    stem_instructions: str
    placement_instructions: str
    avoid_notes: str
    estimated_lifespan_text: str

    model_config = {"from_attributes": True}


class ImportantDateOut(BaseModel):
    id: str
    date_type: str
    custom_label: str | None
    occurs_on: date
    recurring: bool
    reminder_offsets_days: list[int]

    model_config = {"from_attributes": True}


class PersonOut(BaseModel):
    id: str
    name: str
    relationship_type: str
    birthday: date | None
    favorite_flowers: list[str]
    favorite_colors: list[str]
    notes: str | None
    is_favorite: bool
    important_dates: list[ImportantDateOut] = []

    model_config = {"from_attributes": True}

    _coerce_flowers = field_validator("favorite_flowers", mode="before")(_none_to_empty_list)
    _coerce_colors = field_validator("favorite_colors", mode="before")(_none_to_empty_list)


class WishlistItemOut(BaseModel):
    id: str
    person_id: str | None
    product_name: str
    marketplace: str | None
    url: str | None
    sku: str | None
    model: str | None
    size: str | None
    color: str | None
    material: str | None
    image_url: str | None
    notes: str | None

    model_config = {"from_attributes": True}


class AddressOut(BaseModel):
    id: str
    label: str
    line1: str
    line2: str | None
    city: str
    region: str | None
    postal_code: str | None
    country: str
    is_default: bool

    model_config = {"from_attributes": True}


class NotificationOut(BaseModel):
    id: str
    type: str
    title: str
    body: str
    read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
