import logging
import functools
import time
from typing import Callable, Any
from shipcomply_api.config import settings

logger = logging.getLogger(__name__)


def traced(agent_name: str):
    """Decorator that emits an AgentRun row (and Langfuse span) around an async agent call."""
    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            start = time.monotonic()
            try:
                result = await fn(*args, **kwargs)
                latency = int((time.monotonic() - start) * 1000)
                logger.info("agent=%s status=completed latency_ms=%d", agent_name, latency)
                return result
            except Exception as exc:
                latency = int((time.monotonic() - start) * 1000)
                logger.error("agent=%s status=failed latency_ms=%d error=%s", agent_name, latency, exc)
                raise
        return wrapper
    return decorator
