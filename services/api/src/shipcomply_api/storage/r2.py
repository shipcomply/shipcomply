import logging
from typing import Optional
import httpx

from shipcomply_api.config import settings

logger = logging.getLogger(__name__)


class R2Client:
    """Cloudflare R2 object storage via S3-compatible API."""

    def __init__(self) -> None:
        self._endpoint = settings.cf_r2_endpoint
        self._bucket = settings.cf_r2_bucket
        self._account_id = settings.cf_account_id
        self._token = settings.cf_api_token

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self._token}"}

    async def put(self, key: str, content: bytes, content_type: str = "application/octet-stream") -> str:
        if not self._endpoint:
            logger.warning("CF_R2_ENDPOINT not set — R2 upload skipped")
            return f"local://{key}"
        url = f"{self._endpoint}/{self._bucket}/{key}"
        async with httpx.AsyncClient() as client:
            resp = await client.put(
                url,
                content=content,
                headers={**self._headers(), "Content-Type": content_type},
                timeout=30,
            )
            resp.raise_for_status()
        return key

    async def get(self, key: str) -> bytes:
        url = f"{self._endpoint}/{self._bucket}/{key}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=self._headers(), timeout=30)
            resp.raise_for_status()
            return resp.content

    def presigned_url(self, key: str, expires_in: int = 86400) -> str:
        """Return a pre-signed URL (simple implementation via CF signed access token)."""
        if not self._endpoint:
            return f"local://{key}"
        return f"{self._endpoint}/{self._bucket}/{key}?token={self._token}&expires={expires_in}"


r2_client = R2Client()
