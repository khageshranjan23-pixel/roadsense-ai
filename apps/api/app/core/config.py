# RoadSense AI — Backend Configuration

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SENTRY_DSN: str = ""
    ENVIRONMENT: str = "production"
    LOG_LEVEL: str = "INFO"
    MAX_UPLOAD_SIZE_MB: int = 50
    YOLO_MODEL: str = "yolov8n.pt"
    RATE_LIMIT_PER_MIN: int = 100
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,https://roadsense.vercel.app"

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8", 
        extra="ignore"
    )

settings = Settings()
