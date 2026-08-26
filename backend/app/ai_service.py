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
        "You are the Hadiya gift assistant. You can do two things: (1) recommend gift "
        "flowers/bouquets, but only from the given catalog - never invent a product, or "
        "(2) when the user explicitly asks you to write or compose a card message, note, "
        "or wish (rather than asking for a gift/flower recommendation), write one directly "
        "yourself instead of suggesting a product. Reply with ONLY compact JSON of the shape "
        '{"message": "<your answer: either a 1-3 sentence recommendation, or, if asked to '
        'write/compose a message, a ready-to-use written message>", '
        '"recommended_flower_ids": ["<id>", ...]}. '
        "When you are writing a message rather than recommending a gift, leave "
        "recommended_flower_ids as an empty list. Otherwise use at most 3 ids, only ids "
        "that appear in the catalog below."
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


# Strong signal that the question wants a written message rather than a gift
# recommendation. If any recommendation-style language is also present, treat
# it as a normal recommendation request instead (e.g. "recommend a flower and
# write a note" still gets a bouquet suggestion).
_MESSAGE_WRITING_SIGNALS = ["write", "compose", "message", "note", "wish", "card"]
_RECOMMENDATION_SIGNALS = ["flower", "bouquet", "send", "recommend", "suggest a gift"]

# Ready-to-use written messages for when the user asks the assistant to write
# something (e.g. "help me write a birthday message") instead of asking for a
# gift recommendation. Same per-occasion style as _CARD_TEMPLATES, but these
# are complete, standalone messages (no {name} placeholder) since this is a
# direct chat answer, not a card insert tied to one specific order/recipient.
_MESSAGE_TEMPLATES = {
    "birthday": "Wishing you the happiest of birthdays! May your day be filled with laughter, love, and everything that makes you smile.",
    "anniversary": "Happy anniversary! Here's to the love you share and to many more wonderful years together.",
    "thank_you": "Thank you so much - your thoughtfulness means more to me than words can say.",
    "congratulations": "Congratulations! I'm so proud of you and everything you've worked so hard for.",
    "romantic": "Every day with you feels like a gift. Thank you for being exactly who you are.",
    "sympathy": "Thinking of you and holding you close in my thoughts during this difficult time.",
    "friendship": "Just a note to say how grateful I am to have you in my life - thank you for always being there.",
    "just_because": "No special occasion needed - I just wanted you to know I'm thinking of you today.",
}
_DEFAULT_MESSAGE = "Wishing you all the best - sending warm thoughts your way today."


def _is_message_writing_request(question: str) -> bool:
    q = question.lower()
    has_write_signal = any(s in q for s in _MESSAGE_WRITING_SIGNALS)
    has_recommend_signal = any(s in q for s in _RECOMMENDATION_SIGNALS)
    return has_write_signal and not has_recommend_signal


def _detect_message_occasion(question: str, context: dict) -> str | None:
    q = question.lower()
    keyword_map = [
        ("anniversary", "anniversary"),
        ("birthday", "birthday"),
        ("thank you", "thank_you"),
        ("thanks", "thank_you"),
        ("congrat", "congratulations"),
        ("sympathy", "sympathy"),
        ("condolence", "sympathy"),
        ("romantic", "romantic"),
        ("friendship", "friendship"),
        ("just because", "just_because"),
    ]
    for keyword, occasion in keyword_map:
        if keyword in q:
            return occasion
    return context.get("occasion")


def _fallback_write_message(question: str, context: dict) -> dict:
    """A birthday-message-style request ("help me write a ...") is asking the
    assistant to compose text, not to recommend a product. Never invent
    flowers here - recommended_flower_ids stays empty."""
    occasion = _detect_message_occasion(question, context)
    text = _MESSAGE_TEMPLATES.get(occasion, _DEFAULT_MESSAGE)
    return {"message": text, "recommended_flower_ids": []}


def _fallback_recommend(question: str, context: dict, catalog: list[dict]) -> dict:
    if _is_message_writing_request(question):
        return _fallback_write_message(question, context)

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
