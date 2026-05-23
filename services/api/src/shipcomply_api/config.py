from pydantic_settings import BaseSettings
from typing import list as List


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://shipcomply:shipcomply_dev@localhost:5432/shipcomply"
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    groq_api_key: str = ""
    gemini_api_key: str = ""
    cerebras_api_key: str = ""
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5-coder:7b"
    sentry_dsn: str = ""
    cors_origins: list[str] = ["http://localhost:3000"]
    offline: bool = False

    class Config:
        env_file = "../../.env"
        extra = "ignore"


settings = Settings()
