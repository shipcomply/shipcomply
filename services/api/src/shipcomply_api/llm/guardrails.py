"""LLM guardrails — cache, per-provider rate limiting, daily request caps.

Free tier limits (conservative at 80%):
  Groq:     14,400 req/day  -> cap 11,500 | 30 RPM -> cap 24 RPM
  Gemini:      500 req/day  -> cap 400    | 10 RPM -> cap  8 RPM
  Cerebras:    ~500 req/day -> cap 400    | 30 RPM -> cap 24 RPM
  Ollama:   unlimited (local)
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import time
from dataclasses import dataclass, field
from datetime import date
from typing import Any

log = logging.getLogger(__name__)


class ProviderBudgetExceeded(Exception):
    """Raised when a provider has hit its daily cap or RPM limit."""


# ── In-memory response cache ──────────────────────────────────────────────────

@dataclass
class _CacheEntry:
    value: str
    expires_at: float


class LLMCache:
    """SHA-256 keyed in-memory cache with 24-hour TTL."""

    TTL = 86_400  # seconds

    def __init__(self) -> None:
        self._store: dict[str, _CacheEntry] = {}

    def key(self, task: str, system: str, user: str) -> str:
        payload = json.dumps({"task": task, "system": system, "user": user}, sort_keys=True)
        return hashlib.sha256(payload.encode()).hexdigest()

    def get(self, cache_key: str) -> str | None:
        entry = self._store.get(cache_key)
        if entry is None:
            return None
        if time.monotonic() > entry.expires_at:
            del self._store[cache_key]
            return None
        log.debug("LLM cache hit: %s", cache_key[:12])
        return entry.value

    def set(self, cache_key: str, value: str) -> None:
        self._store[cache_key] = _CacheEntry(
            value=value,
            expires_at=time.monotonic() + self.TTL,
        )

    @property
    def size(self) -> int:
        return len(self._store)


# ── Per-provider token bucket + daily cap ─────────────────────────────────────

@dataclass
class ProviderBucket:
    """Token bucket for RPM + daily request counter."""

    name: str
    daily_cap: int
    rpm_cap: int

    _tokens: float = field(init=False)
    _last_refill: float = field(init=False)
    _day: date = field(init=False)
    _daily_used: int = field(init=False)
    _lock: asyncio.Lock = field(init=False)

    def __post_init__(self) -> None:
        self._tokens = float(self.rpm_cap)
        self._last_refill = time.monotonic()
        self._day = date.today()
        self._daily_used = 0
        self._lock = asyncio.Lock()

    def _reset_if_new_day(self) -> None:
        today = date.today()
        if today != self._day:
            log.info("[%s] New day — resetting daily counter (%d used yesterday)", self.name, self._daily_used)
            self._day = today
            self._daily_used = 0

    def _refill(self) -> None:
        now = time.monotonic()
        elapsed = now - self._last_refill
        self._tokens = min(float(self.rpm_cap), self._tokens + elapsed * (self.rpm_cap / 60.0))
        self._last_refill = now

    async def acquire(self) -> None:
        async with self._lock:
            self._reset_if_new_day()

            if self._daily_used >= self.daily_cap:
                raise ProviderBudgetExceeded(
                    f"[{self.name}] Daily cap reached ({self._daily_used}/{self.daily_cap})"
                )

            self._refill()
            if self._tokens < 1:
                wait = (1 - self._tokens) / (self.rpm_cap / 60.0)
                log.warning("[%s] RPM throttle — waiting %.1fs", self.name, wait)
                await asyncio.sleep(wait)
                self._refill()

            self._tokens -= 1
            self._daily_used += 1
            log.debug("[%s] request %d/%d today", self.name, self._daily_used, self.daily_cap)

    def usage(self) -> dict[str, Any]:
        self._reset_if_new_day()
        return {
            "provider": self.name,
            "daily_used": self._daily_used,
            "daily_cap": self.daily_cap,
            "daily_remaining": self.daily_cap - self._daily_used,
            "rpm_tokens": round(self._tokens, 2),
            "rpm_cap": self.rpm_cap,
        }


# ── BudgetGuard — singleton wiring cache + all buckets ───────────────────────

class BudgetGuard:
    def __init__(self, daily_caps: dict[str, int], rpm_caps: dict[str, int]) -> None:
        self.cache = LLMCache()
        self.buckets: dict[str, ProviderBucket] = {
            name: ProviderBucket(
                name=name,
                daily_cap=daily_caps[name],
                rpm_cap=rpm_caps[name],
            )
            for name in daily_caps
        }

    async def acquire(self, provider_name: str) -> None:
        bucket = self.buckets.get(provider_name)
        if bucket is None:
            return  # Ollama — unlimited
        await bucket.acquire()

    def usage_report(self) -> list[dict[str, Any]]:
        return [b.usage() for b in self.buckets.values()]
