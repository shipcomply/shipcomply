import asyncio
import logging
from typing import Callable, Any

logger = logging.getLogger(__name__)

_queue: asyncio.Queue = asyncio.Queue(maxsize=50)


async def enqueue_scan_local(scan_id: str, payload: dict) -> bool:
    """In-process async queue as fallback when Cloudflare Queues unavailable."""
    try:
        _queue.put_nowait({"scan_id": scan_id, **payload})
        return True
    except asyncio.QueueFull:
        logger.error("Local scan queue full — scan %s rejected", scan_id)
        return False


async def run_worker(handler: Callable[[dict], Any]) -> None:
    while True:
        job = await _queue.get()
        try:
            await handler(job)
        except Exception as exc:
            logger.error("Scan worker error for %s: %s", job.get("scan_id"), exc)
        finally:
            _queue.task_done()
