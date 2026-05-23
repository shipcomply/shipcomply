from pydantic_settings import BaseSettings


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

    # LLM daily request caps — 80% of free tier to leave headroom
    llm_daily_cap_groq: int = 11_500     # free tier: 14,400
    llm_daily_cap_gemini: int = 400       # free tier: 500
    llm_daily_cap_cerebras: int = 400     # free tier: ~500 at 2K tokens/req

    # LLM RPM caps — 80% of free tier
    llm_rpm_groq: int = 24               # free tier: 30
    llm_rpm_gemini: int = 8              # free tier: 10
    llm_rpm_cerebras: int = 24           # free tier: 30

    class Config:
        env_file = "../../.env"
        extra = "ignore"


settings = Settings()
