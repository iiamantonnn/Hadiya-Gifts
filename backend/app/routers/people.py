from datetime import date

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app import models
from app.schemas import PersonOut, ImportantDateOut

router = APIRouter(prefix="/api/people", tags=["people"])

RELATIONSHIP_TYPES = [
    "mother", "father", "sister", "brother", "friend", "best_friend", "partner",
    "boyfriend", "girlfriend", "husband", "wife", "spouse", "daughter", "son",
    "grandmother", "grandfather", "colleague", "other",
]
DATE_TYPES = ["birthday", "anniversary", "met", "graduation", "mothers_day", "friendship", "custom"]


class PersonIn(BaseModel):
    name: str
    relationship_type: str
    birthday: str | None = None
    favorite_flowers: list[str] = []
    favorite_colors: list[str] = []
    notes: str | None = None
    is_favorite: bool = False


class ImportantDateIn(BaseModel):
    date_type: str
    custom_label: str | None = None
    occurs_on: str
    recurring: bool = True
    reminder_offsets_days: list[int] = [7, 3, 1, 0]


def _next_occurrence_days(occurs_on: date, recurring: bool, today: date) -> int | None:
    if recurring:
        try:
            this_year = occurs_on.replace(year=today.year)
        except ValueError:  # Feb 29 on a non-leap year
            this_year = occurs_on.replace(year=today.year, day=28)
        target = this_year if this_year >= today else this_year.replace(year=today.year + 1)
        return (target - today).days
    if occurs_on >= today:
        return (occurs_on - today).days
    return None


def _parse_date(value: str, field: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid {field}")


@router.get("", response_model=list[PersonOut])
def list_people(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Person).filter(models.Person.owner_id == user.id).order_by(models.Person.is_favorite.desc(), models.Person.name).all()


@router.post("", status_code=201, response_model=PersonOut)
def create_person(payload: PersonIn, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.relationship_type not in RELATIONSHIP_TYPES:
        raise HTTPException(status_code=400, detail="Invalid relationship type")
    birthday = _parse_date(payload.birthday, "birthday") if payload.birthday else None
    row = models.Person(
        owner_id=user.id, name=payload.name, relationship_type=payload.relationship_type,
        birthday=birthday, favorite_flowers=payload.favorite_flowers, favorite_colors=payload.favorite_colors,
        notes=payload.notes, is_favorite=payload.is_favorite,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _get_owned_person(db: Session, person_id: str, user: models.User) -> models.Person:
    row = db.get(models.Person, person_id)
    if not row or row.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Person not found")
    return row


def has_accepted_pairing(db: Session, user_id_a: str, user_id_b: str) -> bool:
    return db.query(models.Pairing).filter(
        models.Pairing.status == "accepted",
        ((models.Pairing.requester_id == user_id_a) & (models.Pairing.recipient_id == user_id_b))
        | ((models.Pairing.requester_id == user_id_b) & (models.Pairing.recipient_id == user_id_a)),
    ).first() is not None


@router.get("/{person_id}/delivery-options")
def delivery_options(person_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Never returns address content - only which private delivery
    locations (home/work) the recipient has made available, and only if
    they're a currently-paired Hadiya account."""
    person = _get_owned_person(db, person_id, user)

    if not person.linked_user_id or not has_accepted_pairing(db, user.id, person.linked_user_id):
        return {"available": False, "types": []}

    rows = db.query(models.Address.address_type).filter(
        models.Address.user_id == person.linked_user_id,
        models.Address.address_type.in_(["home", "work"]),
    ).distinct().all()
    types = [r[0] for r in rows]
    return {"available": len(types) > 0, "types": types}


@router.patch("/{person_id}", response_model=PersonOut)
def update_person(person_id: str, payload: PersonIn, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _get_owned_person(db, person_id, user)
    if payload.relationship_type not in RELATIONSHIP_TYPES:
        raise HTTPException(status_code=400, detail="Invalid relationship type")
    row.name = payload.name
    row.relationship_type = payload.relationship_type
    row.birthday = _parse_date(payload.birthday, "birthday") if payload.birthday else None
    row.favorite_flowers = payload.favorite_flowers
    row.favorite_colors = payload.favorite_colors
    row.notes = payload.notes
    row.is_favorite = payload.is_favorite
    db.commit()
    return row


@router.delete("/{person_id}")
def delete_person(person_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _get_owned_person(db, person_id, user)
    db.delete(row)
    db.commit()
    return {"message": "Person removed"}


@router.post("/{person_id}/dates", status_code=201, response_model=ImportantDateOut)
def add_important_date(person_id: str, payload: ImportantDateIn, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_owned_person(db, person_id, user)
    if payload.date_type not in DATE_TYPES:
        raise HTTPException(status_code=400, detail="Invalid date type")
    row = models.ImportantDate(
        person_id=person_id, date_type=payload.date_type, custom_label=payload.custom_label,
        occurs_on=_parse_date(payload.occurs_on, "occurs_on"), recurring=payload.recurring,
        reminder_offsets_days=payload.reminder_offsets_days,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/dates/{date_id}")
def delete_important_date(date_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.get(models.ImportantDate, date_id)
    if not row or row.person.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Date not found")
    db.delete(row)
    db.commit()
    return {"message": "Date removed"}


@router.get("/upcoming-events")
def upcoming_events(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today()
    people = db.query(models.Person).filter(models.Person.owner_id == user.id).all()
    events = []

    for person in people:
        if person.birthday:
            days = _next_occurrence_days(person.birthday, True, today)
            if days is not None and days <= 60:
                events.append({
                    "person_id": person.id, "person_name": person.name, "label": "Birthday",
                    "days_until": days,
                })
        for d in person.important_dates:
            days = _next_occurrence_days(d.occurs_on, d.recurring, today)
            if days is not None and days <= 60:
                label = d.custom_label if d.date_type == "custom" and d.custom_label else d.date_type.replace("_", " ").title()
                events.append({
                    "person_id": person.id, "person_name": person.name, "label": label,
                    "days_until": days,
                })

    events.sort(key=lambda e: e["days_until"])
    return events
