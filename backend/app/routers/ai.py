from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app import models
from app.ai_service import get_recommendation
from app.schemas import FlowerOut

router = APIRouter(prefix="/api/ai", tags=["ai"])


class AskIn(BaseModel):
    question: str
    occasion: str | None = None
    relationship: str | None = None
    budget_usd: float | None = None
    person_id: str | None = None


@router.post("/ask")
def ask(payload: AskIn, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    context = {"occasion": payload.occasion, "relationship": payload.relationship, "budget_usd": payload.budget_usd}

    if payload.person_id:
        person = db.get(models.Person, payload.person_id)
        if person and person.owner_id == user.id:
            context["relationship"] = context["relationship"] or person.relationship_type
            context["favorite_flowers"] = person.favorite_flowers
            context["favorite_colors"] = person.favorite_colors

    result = get_recommendation(db, payload.question, context)

    flowers = []
    if result["recommended_flower_ids"]:
        flowers = db.query(models.Flower).filter(models.Flower.id.in_(result["recommended_flower_ids"])).all()

    return {
        "message": result["message"], "source": result["source"],
        "flowers": [FlowerOut.model_validate(f) for f in flowers],
    }
