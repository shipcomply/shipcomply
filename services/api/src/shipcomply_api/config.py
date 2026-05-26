from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Neon Postgres (pgbouncer pool URL + direct for migrations)
    database_url: str = "postgresql+asyncpg://shipcomply:shipcomply_dev@localhost:5432/shipcomply"
    direct_url: str = ""

    # Clerk Auth
    clerk_secret_key: str = ""
    clerk_jwks_url: str = ""
    clerk_webhook_secret: str = ""

    # Legacy Supabase — kept during migration; remove after
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # LLM providers — existing
    groq_api_key: str = ""
    gemini_api_key: str = ""
    cerebras_api_key: str = ""

    # LLM providers — new free tiers
    nvidia_api_key: str = ""
    deepseek_api_key: str = ""
    zhipu_api_key: str = ""
    kimi_api_key: str = ""

    # Local fallback
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5-coder:7b"

    # Cloudflare
    cf_account_id: str = ""
    cf_api_token: str = ""
    cf_r2_bucket: str = "shipcomply-artifacts"
    cf_r2_endpoint: str = ""
    cf_kv_namespace_id: str = ""
    cf_queue_name: str = "scan-jobs"

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    # Observability
    sentry_dsn: str = ""
    langfuse_host: str = "http://localhost:3001"
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""

    # App
    cors_origins: list[str] = ["http://localhost:3000", "https://shipcomply.dev"]
    web_url: str = "http://localhost:3000"
    offline: bool = False
    debug: bool = False

    # Rate limiting tiers
    free_scans_per_day: int = 3
    paid_scans_per_day: int = 50
    anon_scans_per_hour_ip: int = 1

    # LLM daily request caps — 80% of free tier
    llm_daily_cap_groq: int = 11_500
    llm_daily_cap_gemini: int = 400
    llm_daily_cap_cerebras: int = 400
    llm_daily_cap_nvidia: int = 800
    llm_daily_cap_deepseek: int = 5_000_000
    llm_daily_cap_zhipu: int = 999_999
    llm_daily_cap_kimi: int = 800

    # LLM RPM caps — 80% of free tier
    llm_rpm_groq: int = 24
    llm_rpm_gemini: int = 8
    llm_rpm_cerebras: int = 24
    llm_rpm_nvidia: int = 32
    llm_rpm_deepseek: int = 60
    llm_rpm_zhipu: int = 60
    llm_rpm_kimi: int = 60

    class Config:
        env_file = "../../.env"
        extra = "ignore"


settings = Settings()
