"""AIService: one abstraction, one place to swap the provider.

Tries Google's Generative Language API (Gemini) if GOOGLE_AI_API_KEY is set.
On any failure (missing key, bad key, network error, malformed response) it
falls back to a rule-based recommender so the assistant always returns a
useful, catalog-grounded answer instead of an error. The AI is never allowed
to invent products - every recommendation is matched back to a real Flower
row before it reaches the client; anything it can't match is dropped.
"""

import json
import re

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app import models

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def _catalog_context(db: Session) -> list[dict]:
    flowers = db.query(models.Flower).filter(models.Flower.available.is_(True)).all()
    return [
        {
            "id": f.id, "name": f.name, "price_usd": round(f.price_cents / 100, 2),
            "flower_type": f.flower_type, "colors": f.colors, "occasions": f.occasions,
            "recommended_relationships": f.recommended_relationships,
        }
        for f in flowers
    ]


def _call_gemini(question: str, context: dict, catalog: list[dict]) -> dict | None:
    if not settings.google_ai_api_key:
        return None

    system_prompt = (
        "You are the Hadiya gift assistant. Recommend only from the given catalog - "
        "never invent a product. Reply with ONLY compact JSON of the shape "
        '{"message": "<1-3 sentence answer>", "recommended_flower_ids": ["<id>", ...]}. '
        "Use at most 3 ids, only ids that appear in the catalog below."
    )
    user_prompt = (
        f"Context: {json.dumps(context)}\n"
        f"Catalog: {json.dumps(catalog)}\n"
        f"Question: {question}"
    )

    url = GEMINI_URL.format(model=settings.google_ai_model)
    try:
        resp = httpx.post(
            url,
            params={"key": settings.google_ai_api_key},
            json={
                "system_instruction": {"parts": [{"text": system_prompt}]},
                "contents": [{"parts": [{"text": user_prompt}]}],
                # Forcing responseMimeType=json measurably increased latency
                # on this model without improving reliability - a plain-text
                # reply parsed leniently below is faster and just as robust.
                "generationConfig": {"temperature": 0.4},
            },
            timeout=45.0,
        )
        resp.raise_for_status()
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            return None
        parsed = json.loads(match.group(0))
        if "message" not in parsed:
            return None
        parsed.setdefault("recommended_flower_ids", [])
        return parsed
    except (httpx.HTTPError, KeyError, IndexError, json.JSONDecodeError, ValueError):
        return None


def _fallback_recommend(question: str, context: dict, catalog: list[dict]) -> dict:
    q = question.lower()
    occasion = context.get("occasion")
    relationship = context.get("relationship")
    max_price = context.get("budget_usd")

    matches = catalog
    if occasion:
        matches = [f for f in matches if occasion in (f["occasions"] or [])]
    if relationship:
        rel_matches = [f for f in matches if relationship in (f["recommended_relationships"] or [])]
        if rel_matches:
            matches = rel_matches
    if max_price:
        price_matches = [f for f in matches if f["price_usd"] <= max_price]
        if price_matches:
            matches = price_matches

    for word, color in [("white", "white"), ("red", "red"), ("pink", "pink"), ("yellow", "yellow")]:
        if word in q:
            color_matches = [f for f in matches if color in (f["colors"] or [])]
            if color_matches:
                matches = color_matches

    if not matches:
        matches = catalog

    top = matches[:3]
    if not top:
        return {"message": "I couldn't find a matching bouquet right now - try browsing the full catalog.", "recommended_flower_ids": []}

    names = ", ".join(f["name"] for f in top)
    return {
        "message": f"Based on what you're looking for, I'd suggest: {names}.",
        "recommended_flower_ids": [f["id"] for f in top],
    }


_CARD_TEMPLATES = {
    "birthday": "Wishing you a wonderful birthday, {name}! Hope your day is as special as you are.",
    "anniversary": "Happy anniversary, {name}. Grateful for every moment.",
    "friendship": "Just a little something to remind you how much your friendship means, {name}.",
    "thank_you": "Thank you, {name} - this small gift comes with a lot of gratitude.",
    "congratulations": "Congratulations, {name}! So happy for you.",
    "romantic": "For you, {name} - with all my love.",
    "sympathy": "Thinking of you, {name}, during this difficult time.",
    "just_because": "No reason needed - just wanted you to know I'm thinking of you, {name}.",
}


def generate_card_message(occasion: str | None, relationship: str, recipient_name: str) -> str:
    """Used when the buyer asks for an AI-written card message. Same
    fallback philosophy as get_recommendation - a template if Gemini isn't
    available, never an error."""
    if settings.google_ai_api_key:
        prompt = (
            f"Write one short, warm gift-card message (max 2 sentences, no emoji) "
            f"for a {relationship} named {recipient_name}"
            + (f" for the occasion: {occasion}." if occasion else ".")
        )
        try:
            url = GEMINI_URL.format(model=settings.google_ai_model)
            resp = httpx.post(
                url, params={"key": settings.google_ai_api_key},
                json={"contents": [{"parts": [{"text": prompt}]}]}, timeout=30.0,
            )
            resp.raise_for_status()
            text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            if text:
                return text
        except (httpx.HTTPError, KeyError, IndexError):
            pass

    template = _CARD_TEMPLATES.get(occasion or "", "Thinking of you, {name}.")
    return template.format(name=recipient_name)


def get_recommendation(db: Session, question: str, context: dict) -> dict:
    catalog = _catalog_context(db)

    result = _call_gemini(question, context, catalog)
    source = "gemini"
    if result is None:
        result = _fallback_recommend(question, context, catalog)
        source = "fallback"

    # Never let the model reference a product that doesn't exist.
    valid_ids = {f["id"] for f in catalog}
    result["recommended_flower_ids"] = [fid for fid in result.get("recommended_flower_ids", []) if fid in valid_ids][:3]
    result["source"] = source
    return result
