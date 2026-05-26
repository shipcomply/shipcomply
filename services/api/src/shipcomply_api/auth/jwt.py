import logging
import time
from typing import Optional
from jose import JWTError, jwt
import httpx

from shipcomply_api.config import settings
from shipcomply_api.auth.denylist import is_denied, deny

logger = logging.getLogger(__name__)

_jwks_cache: Optional[dict] = None
_jwks_cached_at: float = 0.0
_JWKS_TTL = 600


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
    claims = jwt.decode(token, jwks, algorithms=["RS256"], options={"verify_aud": False})

    if "exp" not in claims:
        raise JWTError("Token missing exp claim")

    # Replay denylist — check revoked JTI
    jti = claims.get("jti")
    if jti and is_denied(jti):
        raise JWTError("Token has been revoked")

    return claims


async def revoke_token(token: str) -> None:
    """Add a token's JTI to the denylist until its expiry."""
    try:
        claims = jwt.decode(token, options={"verify_signature": False})
        jti = claims.get("jti")
        exp = claims.get("exp", 0)
        if jti:
            deny(jti, float(exp))
    except Exception as exc:
        logger.warning("revoke_token: could not extract jti: %s", exc)
