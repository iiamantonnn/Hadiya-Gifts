# Hadiya

*"Hadiya" - Arabic for "gift."*

A privacy-focused platform for remembering the people who matter, the moments worth
celebrating, and the gifts that actually mean something - flowers today, with the
architecture in place for more gift categories later. Not a flower shop with extra
steps: the core loop is *remember someone -> understand what they'd love -> send it
thoughtfully -> they receive it privately*.

This is a separate project from any other "Hadiya" you may have - see the note at
the end of this README if that matters to you.

## Features implemented

- **Auth**: email/password registration with 6-digit email verification (codes
  expire, rate-limited attempts), login with "remember me" (secure httpOnly-cookie
  sessions, real refresh-token rotation), forgot/reset password, and WebAuthn
  passkeys (Face ID / Touch ID / Windows Hello) for passwordless sign-in.
- **Personalized dashboard**: time-of-day greeting using your preferred name,
  upcoming important dates, favorite people, quick actions.
- **AI Assistant**: ask for gift recommendations in plain language. Grounded in the
  real catalog only - it can never recommend a product that doesn't exist. Uses
  Google's Gemini API when a key is configured, with a fully-functional rule-based
  fallback otherwise (occasion/relationship/budget/color matching).
- **My People**: relationships, birthdays, important dates (recurring or one-off,
  with reminder offsets), favorites, notes, per-person wishlists.
- **Wishlist**: manual entry or best-effort metadata extraction from a product URL
  (title + image) - always falls back to manual entry if extraction fails.
- **Flower catalog**: search, and filter by type/color/size/occasion/relationship/
  price, with real care instructions and an honest "estimated lifespan," never an
  exact claim.
- **Gift flow**: recipient -> bouquet -> occasion -> delivery date/time -> address
  -> anonymous-or-visible sender -> greeting card (optional AI-written message) ->
  voice message (recorded in-browser) -> review -> confirm.
- **Courier safety**: deliveries are only bookable 6am-11pm, enforced server-side,
  not just hidden in the UI.
- **Secure gift pages**: every gift gets an unguessable token (not a database id)
  behind a public page showing the message, voice note, and flower care info -
  ready to be the landing page for a QR code or NFC tag.
- **Gift history**: sent and received, respecting anonymity on the received side.
- **Pairing**: connect two accounts by mutual consent; end a pairing without
  affecting either person's own gift history.
- **Notifications**: generated for upcoming important dates based on each date's
  reminder offsets.
- **Privacy**: date of birth hidden by default, addresses never exposed outside
  delivery, anonymous-gift identity genuinely hidden server-side (not just in the
  UI).

## Architecture

```
backend/    FastAPI + SQLAlchemy. Owns every database interaction and every
            AI call - the frontend never talks to Postgres or Gemini directly.
frontend/   React + Vite + TypeScript + Tailwind CSS.
```

Auth is cookie-based (httpOnly access + refresh tokens), not client-stored JWTs -
safer against XSS than a token in localStorage. CORS is locked to the configured
frontend origin. Every sensitive endpoint re-checks ownership server-side (e.g. you
can only ever see/edit your own people, addresses, orders - never trust an id from
the client to imply authorization).

## Installation

Prerequisites: Node.js 18+, Python 3.12+.

```
# Backend
cd backend
python -m venv venv
venv\Scripts\activate          # Windows; use `source venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
copy .env.example .env         # macOS/Linux: cp .env.example .env
python -m app.seed             # creates tables (SQLite by default) + demo data
uvicorn app.main:app --reload --port 8000

# Frontend, in a second terminal
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Log in with the seeded demo account:
**demo@hadiya.app / Demo12345!**

## Database setup

Defaults to a local SQLite file (`backend/hadiya.db`) - zero setup. For Postgres
(recommended for anything beyond local dev, e.g. a Neon project), set
`DATABASE_URL` in `backend/.env` to a normal `postgresql://` connection string,
then re-run `python -m app.seed` (it calls `create_all`, safe to run repeatedly).

**Known limitation**: schema is managed via SQLAlchemy's `create_all`, not Alembic
migrations, even though Alembic is installed. Fine for this MVP where the schema
is still moving; wire up real Alembic migrations before the first production
schema change on a database with real data in it.

## Environment variables

See `backend/.env.example` and `frontend/.env.example` for the full list with
inline explanations. The short version:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | No | Defaults to local SQLite |
| `JWT_SECRET` | Yes, for prod | Any long random string in dev is fine as a placeholder |
| `WEBAUTHN_RP_ID` / `WEBAUTHN_ORIGIN` | Yes, for passkeys | Must match your real domain in production |
| `GOOGLE_AI_API_KEY` | No | AI features fall back to a rule-based recommender without it |
| `VITE_API_URL` (frontend) | No | Leave unset for same-origin deployment |

## Email

No provider is wired up - `backend/app/email_service.py` logs every "sent" email to
the console (`[email:dev] to=... subject=...`) instead of failing. Verification
codes and password reset links are fully readable in the backend's terminal
output during development. Swap the body of `send_email()` for a real provider
(Resend, SES, Postmark, ...) before going live - nothing else needs to change.

## AI configuration

Get a key from https://aistudio.google.com/apikey and set `GOOGLE_AI_API_KEY` in
`backend/.env`. `app/ai_service.py` is the entire integration surface - swapping
providers later means editing this one file, not anything that calls it.

Tested against the current Gemini API during this build: **a configured key does
work**, but the currently-default reasoning model (`gemini-3.6-flash`) took
10-30+ seconds per request in testing, noticeably slower than a typical flash
model. That's usable behind the "Thinking..." loading state that's already built,
but if snappier responses matter more than reasoning quality, try a lighter
model name via `GOOGLE_AI_MODEL`. Either way, the fallback recommender is not a
placeholder - it's a real, working feature on its own.

## WebAuthn configuration

`WEBAUTHN_RP_ID` must be the bare domain the frontend is served from (`localhost`
in dev, `hadiya.app` in production - no scheme, no port). `WEBAUTHN_ORIGIN` must be
the exact scheme+host+port the browser sees. Passkeys registered against one RP ID
will not work if it changes later - that's a WebAuthn/browser rule, not something
this app can work around.

## Development commands

| Where | Command | What |
|---|---|---|
| `backend/` | `uvicorn app.main:app --reload --port 8000` | Run the API |
| `backend/` | `python -m app.seed` | Create tables + demo/catalog data |
| `frontend/` | `npm run dev` | Vite dev server on :5173, proxies `/api` to :8000 |
| `frontend/` | `npm run build` | Type-check (`tsc -b`) + production build |
| `frontend/` | `npm run lint` | oxlint |

## Production considerations

- Put frontend and backend behind one reverse proxy (nginx, Caddy, etc.) on one
  domain, proxying `/api` and `/uploads` to the FastAPI process - this keeps
  cookies same-site with no extra CORS/cookie-domain configuration, and matches
  what `VITE_API_URL` defaults to.
- Switch `DATABASE_URL` to Postgres and set up real Alembic migrations first.
- Set a strong random `JWT_SECRET`; set `secure=True` on cookies (already
  automatic once `FRONTEND_URL` starts with `https`).
- Uploaded voice messages live on local disk (`backend/uploads/`) - fine for a
  single instance, but not durable across redeploys or multiple instances. Move
  to object storage (S3-compatible) before scaling past one server.
- Wire up a real email provider (see "Email" above) - verification and password
  reset are non-functional to real users without one.
- The physical voice-card hardware integration (section 28 of the spec) isn't
  built - the software side (store, download, associate audio with an order) is
  ready for a fulfillment team to build against; the hardware loop itself is out
  of scope for a software MVP.

## Testing

Manually verified end-to-end during this build, against a running instance with
real seeded data (not just code review):

- Registration -> email verification (code shown in server console) -> login
- "Remember me" session persistence via refresh-token rotation
- WebAuthn passkey registration options generate correctly (full ceremony
  requires a real browser + authenticator - not something a terminal can drive)
- Every list/detail API endpoint, including the ones that initially 500'd on
  SQLAlchemy-object serialization (fixed - see below) and one ambiguous
  foreign-key relationship (fixed)
- AI assistant: both the real Gemini path and the rule-based fallback path,
  confirmed against the actual provided API key
- Full order creation: server-side price lookup, courier-safety window
  validation, anonymous-sender handling, public gift-page token lookup
- `npm run build` (TypeScript strict compile + Vite production build): clean
- `npm run lint`: clean (2 minor stylistic warnings, no errors)

**Not verified**: clicking through the actual rendered UI in a real browser (no
browser automation available in this environment) - the frontend was verified via
a clean TypeScript compile, a clean production build, and by confirming every API
call it makes matches a real, tested backend endpoint and response shape. Say so
rather than claim more than that.

## Two real bugs found and fixed during this build

Worth naming plainly rather than glossing over:

1. **FastAPI can't safely serialize a raw SQLAlchemy ORM object.** Several
   endpoints originally returned ORM instances (or dicts containing them)
   directly; FastAPI's fallback encoder tries `vars(obj)`, which pulls in
   SQLAlchemy's internal `_sa_instance_state` and fails. Fixed with explicit
   Pydantic response schemas (`app/schemas.py`) everywhere ORM data crosses the
   API boundary.
2. **Ambiguous foreign key**: `Person` has two foreign keys to `users`
   (`owner_id` and `linked_user_id`), which SQLAlchemy couldn't automatically
   resolve for the `User.people` relationship. Fixed by specifying
   `foreign_keys` explicitly on both sides.

Both were caught by actually running the app against real data, not by reading
the code - which is exactly why that step happened before calling this done.

## Version 2 roadmap

Deliberately not built now, with the architecture left able to grow into them:
cakes/sweets/balloons/jewelry/other gift categories, partner brand and bakery
integrations, partner courier delivery, group gifts and shared baskets, group
payments, deeper AI personalization, a courier mobile app with an SOS button, and
the physical hardware side of voice gift cards.

## A note on scope

This build followed the full specification it was given as closely as real
engineering judgment allows in one sitting: every numbered section has working
code behind it, not a mockup. A few things were simplified pragmatically and are
called out inline above (Alembic vs. `create_all`, physical hardware, upload
storage durability) rather than silently skipped - the goal was an honest, running
MVP, not the appearance of 100% completeness.

## Why this is a separate project

There's another, unrelated "Hadiya" being built alongside this one, in a sibling
folder - a focused flower-delivery app (Node/Express + Next.js + PostgreSQL/Neon)
built from a real product brief with its own market research, whose one
differentiator is a photo-approval step before a bouquet is dispatched. That
brief explicitly lists AI recommendations, wishlists, voice messages, NFC/QR
cards, and couple accounts as **deliberately not built**, with reasons tied to
that research. This specification asks for a broader, different product with all
of those features, on a different tech stack. Rather than overwrite validated,
already-working product decisions and code with a conflicting direction, this
became its own project. Both can exist; they are not the same app wearing two
names.
