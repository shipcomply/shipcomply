import logging
import functools
import inspect
import time
from typing import Callable, Any
from shipcomply_api.config import settings

logger = logging.getLogger(__name__)

_langfuse_client = None


def init_langfuse() -> None:
    global _langfuse_client
    if settings.langfuse_public_key and settings.langfuse_secret_key:
        try:
            from langfuse import Langfuse
            _langfuse_client = Langfuse(
                public_key=settings.langfuse_public_key,
                secret_key=settings.langfuse_secret_key,
                host=settings.langfuse_host,
            )
            logger.info("Langfuse connected at %s", settings.langfuse_host)
        except Exception as exc:
            logger.warning("Langfuse init failed (observability disabled): %s", exc)


def traced(agent_name: str):
    """Decorator for sync or async agent node functions — emits latency log + Langfuse span."""
    def decorator(fn: Callable) -> Callable:
        if inspect.iscoroutinefunction(fn):
            @functools.wraps(fn)
            async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
                span = _start_span(agent_name)
                start = time.monotonic()
                try:
                    result = await fn(*args, **kwargs)
                    _end_span(span, agent_name, start, ok=True)
                    return result
                except Exception as exc:
                    _end_span(span, agent_name, start, ok=False, error=str(exc))
                    raise
            return async_wrapper
        else:
            @functools.wraps(fn)
            def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
                span = _start_span(agent_name)
                start = time.monotonic()
                try:
                    result = fn(*args, **kwargs)
                    _end_span(span, agent_name, start, ok=True)
                    return result
                except Exception as exc:
                    _end_span(span, agent_name, start, ok=False, error=str(exc))
                    raise
            return sync_wrapper
    return decorator


def _start_span(name: str):
    if _langfuse_client:
        try:
            return _langfuse_client.trace(name=name).span(name=name)
        except Exception:
            pass
    return None


def _end_span(span, name: str, start: float, ok: bool, error: str = "") -> None:
    latency = int((time.monotonic() - start) * 1000)
    if ok:
        logger.info("agent=%s status=ok latency_ms=%d", name, latency)
    else:
        logger.error("agent=%s status=failed latency_ms=%d error=%s", name, latency, error)
    if span:
        try:
            span.end(status_message="ok" if ok else error)
        except Exception:
            pass
