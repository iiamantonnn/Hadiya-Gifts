from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Default is SQLite so the app runs with zero external setup. Point this
    # at a Postgres/Neon URL in production - nothing else in the app assumes
    # SQLite specifically.
    database_url: str = "sqlite:///./hadiya.db"

    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 30
    refresh_token_days_default: int = 1
    refresh_token_days_remember_me: int = 30

    frontend_url: str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173"

    webauthn_rp_id: str = "localhost"
    webauthn_rp_name: str = "Hadiya"
    webauthn_origin: str = "http://localhost:5173"

    # Google Generative Language API (Gemini). If unset or the call fails,
    # AIService falls back to a rule-based recommender - see app/ai_service.py.
    google_ai_api_key: str = ""
    google_ai_model: str = "gemini-3.6-flash"

    uploads_dir: str = "./uploads"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
