from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.security import decode_access_token
from app import models


def get_current_user(request: Request, db: Session = Depends(get_db)) -> models.User:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.removeprefix("Bearer ")

    if not token:
        raise HTTPException(status_code=401, detail="Please sign in to continue")

    user_id = decode_access_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Your session has expired, please sign in again")

    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Account not found")

    return user
