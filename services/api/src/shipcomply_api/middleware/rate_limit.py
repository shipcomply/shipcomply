import time
from datetime import datetime, timezone
from collections import defaultdict
from fastapi import Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update as sa_update

# In-process IP bucket (acceptable for anon throttle — worst case limit*workers, still useful)
_ip_buckets: dict[str, tuple[int, float]] = defaultdict(lambda: (0, time.time()))


def _real_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _reset_if_new_window(key: str, store: dict, window_seconds: int) -> tuple[int, float]:
    count, ts = store[key]
    if time.time() - ts > window_seconds:
        store[key] = (0, time.time())
        return 0, time.time()
    return count, ts


async def check_anon_ip_rate(request: Request) -> None:
    from shipcomply_api.config import settings
    ip = _real_ip(request)
    count, ts = _reset_if_new_window(ip, _ip_buckets, 3600)
    if count >= settings.anon_scans_per_hour_ip:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded: 1 anonymous scan per hour",
            headers={"Retry-After": "3600"},
        )
    _ip_buckets[ip] = (count + 1, ts)


async def check_org_daily_quota(org: object, db: AsyncSession) -> None:
    """DB-backed daily quota check. Increments scans_used_today atomically."""
    from shipcomply_api.config import settings
    from shipcomply_api.db.models import Org

    now = datetime.now(timezone.utc)
    reset_at = org.scans_reset_at  # type: ignore[attr-defined]
    if reset_at.tzinfo is None:
        reset_at = reset_at.replace(tzinfo=timezone.utc)

    limit = (
        settings.paid_scans_per_day
        if org.plan in ("team", "enterprise")  # type: ignore[attr-defined]
        else settings.free_scans_per_day
    )

    if (now - reset_at).total_seconds() > 86400:
        await db.execute(
            sa_update(Org).where(Org.id == org.id).values(  # type: ignore[attr-defined]
                scans_used_today=0, scans_reset_at=now
            )
        )
        await db.commit()
        await db.refresh(org)  # type: ignore[attr-defined]

    if org.scans_used_today >= limit:  # type: ignore[attr-defined]
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily scan quota exceeded ({limit}/day on {org.plan} plan). Upgrade for more.",  # type: ignore[attr-defined]
            headers={"X-Plan": org.plan, "X-Quota-Limit": str(limit)},  # type: ignore[attr-defined]
        )

    await db.execute(
        sa_update(Org).where(Org.id == org.id).values(  # type: ignore[attr-defined]
            scans_used_today=org.scans_used_today + 1  # type: ignore[attr-defined]
        )
    )
    await db.commit()
