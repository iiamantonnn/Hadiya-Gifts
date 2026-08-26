import uuid
from datetime import datetime, date

from sqlalchemy import String, Boolean, DateTime, Date, Integer, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


def gen_id() -> str:
    return uuid.uuid4().hex


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    preferred_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    username: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)
    profile_photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    dob_visibility: Mapped[str] = mapped_column(String(20), default="only_me")  # only_me|paired|selected|everyone
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    passkeys: Mapped[list["Passkey"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    addresses: Mapped[list["Address"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    people: Mapped[list["Person"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan", foreign_keys="Person.owner_id"
    )

    def display_name(self) -> str:
        return self.preferred_name or self.first_name


class EmailVerificationCode(Base):
    __tablename__ = "email_verification_codes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    code_hash: Mapped[str] = mapped_column(String(255))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    consumed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    token_hash: Mapped[str] = mapped_column(String(255))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Passkey(Base):
    __tablename__ = "passkeys"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    credential_id: Mapped[str] = mapped_column(String(500), unique=True, index=True)
    public_key: Mapped[str] = mapped_column(Text)  # base64
    sign_count: Mapped[int] = mapped_column(Integer, default=0)
    nickname: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="passkeys")


class WebAuthnChallenge(Base):
    # Short-lived challenge storage for the WebAuthn ceremony (register or login).
    __tablename__ = "webauthn_challenges"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    user_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    challenge: Mapped[str] = mapped_column(String(500))
    purpose: Mapped[str] = mapped_column(String(20))  # register|login
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Address(Base):
    __tablename__ = "addresses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    label: Mapped[str] = mapped_column(String(100))
    line1: Mapped[str] = mapped_column(String(255))
    line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str] = mapped_column(String(100))
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    postal_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    country: Mapped[str] = mapped_column(String(100))
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="addresses")


class Person(Base):
    # "My People"
    __tablename__ = "people"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    owner_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(100))
    relationship_type: Mapped[str] = mapped_column(String(30))  # mother|father|sister|... |other
    birthday: Mapped[date | None] = mapped_column(Date, nullable=True)
    favorite_flowers: Mapped[list] = mapped_column(JSON, default=list)
    favorite_colors: Mapped[list] = mapped_column(JSON, default=list)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    linked_user_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    owner: Mapped["User"] = relationship(back_populates="people", foreign_keys=[owner_id])
    important_dates: Mapped[list["ImportantDate"]] = relationship(back_populates="person", cascade="all, delete-orphan")


class ImportantDate(Base):
    __tablename__ = "important_dates"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    person_id: Mapped[str] = mapped_column(String, ForeignKey("people.id"))
    date_type: Mapped[str] = mapped_column(String(30))  # birthday|anniversary|met|graduation|mothers_day|friendship|custom
    custom_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    occurs_on: Mapped[date] = mapped_column(Date)
    recurring: Mapped[bool] = mapped_column(Boolean, default=True)
    reminder_offsets_days: Mapped[list] = mapped_column(JSON, default=list)  # e.g. [7, 3, 1, 0]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    person: Mapped["Person"] = relationship(back_populates="important_dates")


class WishlistItem(Base):
    __tablename__ = "wishlist_items"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    owner_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    person_id: Mapped[str | None] = mapped_column(String, ForeignKey("people.id"), nullable=True)
    product_name: Mapped[str] = mapped_column(String(255))
    marketplace: Mapped[str | None] = mapped_column(String(100), nullable=True)
    url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    sku: Mapped[str | None] = mapped_column(String(100), nullable=True)
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    size: Mapped[str | None] = mapped_column(String(50), nullable=True)
    color: Mapped[str | None] = mapped_column(String(50), nullable=True)
    material: Mapped[str | None] = mapped_column(String(100), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Flower(Base):
    __tablename__ = "flowers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    price_cents: Mapped[int] = mapped_column(Integer)
    images: Mapped[list] = mapped_column(JSON, default=list)
    flower_type: Mapped[str] = mapped_column(String(50))  # roses|tulips|peonies|lilies|mixed|seasonal|other
    colors: Mapped[list] = mapped_column(JSON, default=list)
    sizes: Mapped[list] = mapped_column(JSON, default=list)  # small|medium|large
    occasions: Mapped[list] = mapped_column(JSON, default=list)
    recommended_relationships: Mapped[list] = mapped_column(JSON, default=list)
    available: Mapped[bool] = mapped_column(Boolean, default=True)
    care_instructions: Mapped[str] = mapped_column(Text, default="")
    water_instructions: Mapped[str] = mapped_column(Text, default="")
    stem_instructions: Mapped[str] = mapped_column(Text, default="")
    placement_instructions: Mapped[str] = mapped_column(Text, default="")
    avoid_notes: Mapped[str] = mapped_column(Text, default="")
    estimated_lifespan_text: Mapped[str] = mapped_column(String(200), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


ORDER_STATUSES = ["placed", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"]

# 06:00-23:00 - never after midnight, matching the courier-safety rule.
COURIER_WINDOWS = [
    {"start": "06:00", "end": "09:00"},
    {"start": "09:00", "end": "12:00"},
    {"start": "12:00", "end": "15:00"},
    {"start": "15:00", "end": "18:00"},
    {"start": "18:00", "end": "21:00"},
    {"start": "21:00", "end": "23:00"},
]


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    buyer_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    recipient_person_id: Mapped[str | None] = mapped_column(String, ForeignKey("people.id"), nullable=True)
    flower_id: Mapped[str] = mapped_column(String, ForeignKey("flowers.id"))
    size: Mapped[str | None] = mapped_column(String(50), nullable=True)
    color: Mapped[str | None] = mapped_column(String(50), nullable=True)
    occasion: Mapped[str | None] = mapped_column(String(50), nullable=True)
    delivery_date: Mapped[date] = mapped_column(Date)
    delivery_window_start: Mapped[str] = mapped_column(String(5))
    delivery_window_end: Mapped[str] = mapped_column(String(5))
    address_id: Mapped[str] = mapped_column(String, ForeignKey("addresses.id"))
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    price_cents: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(30), default="placed")
    wishlist_item_id: Mapped[str | None] = mapped_column(String, ForeignKey("wishlist_items.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    message: Mapped["GiftMessage"] = relationship(back_populates="order", uselist=False, cascade="all, delete-orphan")
    voice_message: Mapped["VoiceMessage"] = relationship(back_populates="order", uselist=False, cascade="all, delete-orphan")
    gift_token: Mapped["GiftToken"] = relationship(back_populates="order", uselist=False, cascade="all, delete-orphan")
    flower: Mapped["Flower"] = relationship()
    recipient: Mapped["Person"] = relationship(foreign_keys=[recipient_person_id])
    buyer: Mapped["User"] = relationship(foreign_keys=[buyer_id])
    wishlist_gift: Mapped["WishlistItem | None"] = relationship()


class GiftMessage(Base):
    __tablename__ = "gift_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    order_id: Mapped[str] = mapped_column(String, ForeignKey("orders.id"), unique=True)
    card_type: Mapped[str] = mapped_column(String(20), default="none")  # none|physical|digital|both
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)

    order: Mapped["Order"] = relationship(back_populates="message")


class VoiceMessage(Base):
    __tablename__ = "voice_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    order_id: Mapped[str] = mapped_column(String, ForeignKey("orders.id"), unique=True)
    audio_path: Mapped[str] = mapped_column(String(500))
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    order: Mapped["Order"] = relationship(back_populates="voice_message")


class GiftToken(Base):
    # The secure, unguessable token behind the QR/NFC gift page. Never the
    # order's own (sequential-ish) id.
    __tablename__ = "gift_tokens"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    order_id: Mapped[str] = mapped_column(String, ForeignKey("orders.id"), unique=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True, default=lambda: uuid.uuid4().hex + uuid.uuid4().hex)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    order: Mapped["Order"] = relationship(back_populates="gift_token")


class Pairing(Base):
    __tablename__ = "pairings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    requester_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    recipient_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|accepted|declined|ended
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    type: Mapped[str] = mapped_column(String(50))
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
