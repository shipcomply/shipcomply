import logging
import httpx
from shipcomply_api.config import settings

logger = logging.getLogger(__name__)


class CFKVClient:
    """Cloudflare Workers KV REST API client for edge caching."""

    _base = "https://api.cloudflare.com/client/v4"

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {settings.cf_api_token}", "Content-Type": "application/json"}

    async def get(self, key: str) -> str | None:
        if not settings.cf_kv_namespace_id:
            return None
        url = f"{self._base}/accounts/{settings.cf_account_id}/storage/kv/namespaces/{settings.cf_kv_namespace_id}/values/{key}"
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(url, headers=self._headers(), timeout=5)
                if resp.status_code == 404:
                    return None
                resp.raise_for_status()
                return resp.text
            except Exception as exc:
                logger.warning("KV get failed: %s", exc)
                return None

    async def put(self, key: str, value: str, ttl_seconds: int = 3600) -> bool:
        if not settings.cf_kv_namespace_id:
            return False
        url = f"{self._base}/accounts/{settings.cf_account_id}/storage/kv/namespaces/{settings.cf_kv_namespace_id}/values/{key}"
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.put(url, content=value.encode(), headers=self._headers(), params={"expiration_ttl": ttl_seconds}, timeout=5)
                resp.raise_for_status()
                return True
            except Exception as exc:
                logger.warning("KV put failed: %s", exc)
                return False


kv_client = CFKVClient()
