import logging
from shipcomply_api.config import settings

logger = logging.getLogger(__name__)


def init_langfuse() -> None:
    """Initialize Langfuse OTel exporter at FastAPI startup."""
    if not settings.langfuse_public_key or not settings.langfuse_secret_key:
        logger.info("Langfuse not configured — LLM tracing disabled")
        return
    try:
        from langfuse.openai import openai  # noqa: F401  — patches openai client globally
        from langfuse import Langfuse
        Langfuse(
            host=settings.langfuse_host,
            public_key=settings.langfuse_public_key,
            secret_key=settings.langfuse_secret_key,
        )
        logger.info("Langfuse tracing initialized at %s", settings.langfuse_host)
    except ImportError:
        logger.warning("langfuse package not installed — pip install langfuse to enable tracing")
