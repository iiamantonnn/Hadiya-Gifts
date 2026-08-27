from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine
from app import models  # noqa: F401 - registers models on Base before create_all
from app.routers import auth, webauthn_routes, users, people, wishlist, catalog, ai, orders, gift_page, pairing, notifications, payments

Base.metadata.create_all(bind=engine)

Path(settings.uploads_dir).mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Hadiya API")

app.add_middleware(
    CORSMiddleware,
    # Wildcarded for this test project - Starlette reflects the actual
    # request Origin (rather than a literal "*") whenever a cookie is
    # present, so this stays compatible with allow_credentials.
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.uploads_dir), name="uploads")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Never leak stack traces / internals to the client.
    print(f"Unhandled error on {request.method} {request.url.path}: {exc!r}")
    return JSONResponse(status_code=500, content={"detail": "Something went wrong. Please try again."})


app.include_router(auth.router)
app.include_router(webauthn_routes.router)
app.include_router(users.router)
app.include_router(people.router)
app.include_router(wishlist.router)
app.include_router(catalog.router)
app.include_router(ai.router)
app.include_router(orders.router)
app.include_router(gift_page.router)
app.include_router(pairing.router)
app.include_router(notifications.router)
app.include_router(payments.router)


@app.get("/api/health")
def health():
    return {"ok": True}
