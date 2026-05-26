"""Cloudflare R2 object storage via boto3 S3-compatible API (SigV4 auth)."""
import asyncio
import logging
from functools import partial
from typing import Optional

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from shipcomply_api.config import settings

logger = logging.getLogger(__name__)


def _make_client():
    if not settings.cf_r2_endpoint:
        return None
    return boto3.client(
        "s3",
        endpoint_url=settings.cf_r2_endpoint,
        aws_access_key_id=settings.cf_r2_access_key_id,
        aws_secret_access_key=settings.cf_r2_secret_access_key,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


class R2Client:
    """Cloudflare R2 object storage. Falls back to local:// when not configured."""

    def __init__(self) -> None:
        self._bucket = settings.cf_r2_bucket
        self._s3 = _make_client()

    async def put(self, key: str, content: bytes, content_type: str = "application/octet-stream") -> str:
        if not self._s3:
            logger.warning("CF_R2_ENDPOINT not set — R2 upload skipped, key=%s", key)
            return f"local://{key}"
        loop = asyncio.get_event_loop()
        try:
            await loop.run_in_executor(
                None,
                partial(
                    self._s3.put_object,
                    Bucket=self._bucket,
                    Key=key,
                    Body=content,
                    ContentType=content_type,
                ),
            )
        except (BotoCoreError, ClientError) as exc:
            logger.error("R2 put failed key=%s: %s", key, exc)
            return f"local://{key}"
        return key

    async def get(self, key: str) -> bytes:
        if not self._s3:
            raise RuntimeError(f"R2 not configured, cannot fetch key={key}")
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            partial(self._s3.get_object, Bucket=self._bucket, Key=key),
        )
        return response["Body"].read()

    def presigned_url(self, key: str, expires_in: int = 86400) -> Optional[str]:
        if not self._s3:
            return None
        try:
            return self._s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": self._bucket, "Key": key},
                ExpiresIn=expires_in,
            )
        except (BotoCoreError, ClientError) as exc:
            logger.error("R2 presign failed key=%s: %s", key, exc)
            return None


r2_client = R2Client()
