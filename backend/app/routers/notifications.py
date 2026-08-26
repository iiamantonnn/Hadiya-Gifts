from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app import models
from app.routers.people import _next_occurrence_days
from app.schemas import NotificationOut

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.post("/sync")
def sync_notifications(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """No background scheduler in this MVP - reminders are generated
    opportunistically whenever the dashboard loads. Good enough to
    demonstrate the real behavior; a cron/worker is the production version."""
    today = date.today()
    people = db.query(models.Person).filter(models.Person.owner_id == user.id).all()
    created = 0

    for person in people:
        candidates = []
        if person.birthday:
            candidates.append(("birthday", person.birthday, True, [7, 3, 1, 0]))
        for d in person.important_dates:
            candidates.append((d.date_type, d.occurs_on, d.recurring, d.reminder_offsets_days))

        for date_type, occurs_on, recurring, offsets in candidates:
            days = _next_occurrence_days(occurs_on, recurring, today)
            if days is None or days not in offsets:
                continue
            dedupe_key = f"{person.id}:{date_type}:{today.isoformat()}"
            already = db.query(models.Notification).filter(
                models.Notification.user_id == user.id,
                models.Notification.type == "important_date",
                models.Notification.body.like(f"%{dedupe_key}%"),
            ).first()
            if already:
                continue
            when = "today" if days == 0 else f"in {days} day{'s' if days != 1 else ''}"
            db.add(models.Notification(
                user_id=user.id, type="important_date",
                title=f"{person.name}'s {date_type.replace('_', ' ')} is {when}",
                body=f"Don't forget {person.name}'s {date_type.replace('_', ' ')}. [{dedupe_key}]",
            ))
            created += 1

    db.commit()
    return {"created": created}


@router.get("", response_model=list[NotificationOut])
def list_notifications(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Notification).filter(models.Notification.user_id == user.id).order_by(models.Notification.created_at.desc()).limit(50).all()


@router.post("/{notification_id}/read")
def mark_read(notification_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.get(models.Notification, notification_id)
    if not row or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    row.read = True
    db.commit()
    return {"message": "Marked as read"}


@router.post("/read-all")
def mark_all_read(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(models.Notification).filter(models.Notification.user_id == user.id, models.Notification.read.is_(False)).update({"read": True})
    db.commit()
    return {"message": "All notifications marked as read"}
