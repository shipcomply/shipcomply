import logging
import httpx
from shipcomply_api.config import settings

logger = logging.getLogger(__name__)


async def enqueue_scan(scan_id: str, payload: dict) -> bool:
    """Push a scan job to Cloudflare Queue. Returns True on success."""
    if not settings.cf_account_id or not settings.cf_api_token:
        logger.info("CF Queues not configured — falling back to synchronous scan")
        return False

    url = (
        f"https://api.cloudflare.com/client/v4/accounts/{settings.cf_account_id}"
        f"/queues/{settings.cf_queue_name}/messages"
    )
    body = {"messages": [{"body": {"scan_id": scan_id, **payload}}]}
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                url,
                json=body,
                headers={"Authorization": f"Bearer {settings.cf_api_token}"},
                timeout=10,
            )
            resp.raise_for_status()
            return True
        except Exception as exc:
            logger.warning("CF Queue enqueue failed: %s — falling back to sync", exc)
            return False
