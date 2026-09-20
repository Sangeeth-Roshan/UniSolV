from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/unisolv"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Application
    SECRET_KEY: str = "change-me-in-production"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    # ---------------------------------------------------------------------------
    # ML / Classification
    # ---------------------------------------------------------------------------
    # "cached" uses the pre-embedded synthetic dataset (no API key needed).
    # "live"   calls a real LLM (requires GROQ_API_KEY or GEMINI_API_KEY).
    CLASSIFIER_MODE: str = "cached"

    # Which LLM backend to use when CLASSIFIER_MODE=live
    LLM_PROVIDER: str = "gemini"  # "groq" | "gemini"

    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    # Cosine-similarity threshold below which a result is flagged for human review
    SIMILARITY_THRESHOLD: float = 0.5

    # ---------------------------------------------------------------------------
    # Clustering & Hotspot Detection
    # ---------------------------------------------------------------------------
    # Radius (metres) within which PostGIS searches for nearby clusters
    CLUSTER_RADIUS_METERS: int = 500

    # Cosine-similarity threshold to merge a new ticket into an existing cluster
    CLUSTER_SIMILARITY_THRESHOLD: float = 0.75

    # How many past days of tickets DBSCAN scans for hotspot detection
    HOTSPOT_LOOKBACK_DAYS: int = 10

    # Minimum cluster member count to be declared a hotspot
    HOTSPOT_MIN_MEMBERS: int = 5

    # How often (hours) the hotspot detection job runs
    HOTSPOT_JOB_INTERVAL_HOURS: int = 1


settings = Settings()
