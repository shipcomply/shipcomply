import time
from collections import defaultdict
from fastapi import Request, HTTPException, status


_ip_buckets: dict[str, tuple[int, float]] = defaultdict(lambda: (0, time.time()))
_org_daily: dict[str, tuple[int, float]] = defaultdict(lambda: (0, time.time()))


def _reset_if_new_window(key: str, store: dict, window_seconds: int) -> tuple[int, float]:
    count, ts = store[key]
    if time.time() - ts > window_seconds:
        store[key] = (0, time.time())
        return 0, time.time()
    return count, ts


async def check_anon_ip_rate(request: Request) -> None:
    from shipcomply_api.config import settings
    ip = request.client.host if request.client else "unknown"
    count, ts = _reset_if_new_window(ip, _ip_buckets, 3600)
    if count >= settings.anon_scans_per_hour_ip:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded: 1 anonymous scan per hour",
            headers={"Retry-After": "3600"},
        )
    _ip_buckets[ip] = (count + 1, ts)


async def check_org_daily_quota(org_id: str, plan: str = "free") -> None:
    from shipcomply_api.config import settings
    limit = settings.paid_scans_per_day if plan in ("team", "enterprise") else settings.free_scans_per_day
    count, ts = _reset_if_new_window(org_id, _org_daily, 86400)
    if count >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily scan quota exceeded ({limit}/day on {plan} plan). Upgrade for more.",
            headers={"X-Plan": plan, "X-Quota-Limit": str(limit)},
        )
    _org_daily[org_id] = (count + 1, ts)
