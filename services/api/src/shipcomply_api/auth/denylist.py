"""JWT replay denylist — in-process store for revoked JTI tokens until exp."""
from __future__ import annotations

import time
from threading import Lock

_store: dict[str, float] = {}  # jti -> exp timestamp
_lock = Lock()


def deny(jti: str, exp: float) -> None:
    with _lock:
        _store[jti] = exp
        _purge()


def is_denied(jti: str) -> bool:
    with _lock:
        _purge()
        return jti in _store


def _purge() -> None:
    now = time.time()
    expired = [k for k, v in _store.items() if v < now]
    for k in expired:
        del _store[k]
