import logging
import time
from typing import Optional
from jose import JWTError, jwt
import httpx

from shipcomply_api.config import settings

logger = logging.getLogger(__name__)

_jwks_cache: Optional[dict] = None
_jwks_cached_at: float = 0.0
_JWKS_TTL = 600  # 10 minutes


async def _get_jwks() -> dict:
    global _jwks_cache, _jwks_cached_at
    now = time.monotonic()
    if _jwks_cache and (now - _jwks_cached_at) < _JWKS_TTL:
        return _jwks_cache
    if not settings.clerk_jwks_url:
        raise RuntimeError(
            "CLERK_JWKS_URL is not configured. Set it to your Clerk JWKS endpoint "
            "(e.g. https://your-domain.clerk.accounts.dev/.well-known/jwks.json)."
        )
    async with httpx.AsyncClient() as client:
        resp = await client.get(settings.clerk_jwks_url, timeout=10)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        _jwks_cached_at = now
        return _jwks_cache


async def verify_clerk_token(token: str) -> dict:
    """Verify Clerk JWT (RS256). Returns decoded claims or raises JWTError/RuntimeError."""
    if settings.debug and not settings.clerk_jwks_url:
        logger.warning("DEBUG mode: skipping JWT verification — set CLERK_JWKS_URL in production")
        return jwt.decode(token, options={"verify_signature": False})

    jwks = await _get_jwks()
    # python-jose handles JWK sets natively; pass the full {"keys":[...]} dict
    claims = jwt.decode(
        token,
        jwks,
        algorithms=["RS256"],
        options={"verify_aud": False},
    )
    # Explicit expiry check (belt-and-suspenders)
    if "exp" not in claims:
        raise JWTError("Token missing exp claim")
    return claims
