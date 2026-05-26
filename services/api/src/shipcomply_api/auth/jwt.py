import logging
from typing import Optional
from jose import JWTError, jwt
import httpx

from shipcomply_api.config import settings

logger = logging.getLogger(__name__)
_jwks_cache: Optional[dict] = None


async def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache
    if not settings.clerk_jwks_url:
        return {}
    async with httpx.AsyncClient() as client:
        resp = await client.get(settings.clerk_jwks_url, timeout=10)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        return _jwks_cache


async def verify_clerk_token(token: str) -> dict:
    """Verify Clerk JWT. Returns decoded claims or raises JWTError."""
    jwks = await _get_jwks()
    if not jwks:
        # Dev mode: decode without verification when no JWKS configured
        logger.warning("No CLERK_JWKS_URL set — skipping JWT signature verification (dev only)")
        return jwt.decode(token, options={"verify_signature": False})
    return jwt.decode(token, jwks, algorithms=["RS256"])
