"""Pre-warm demo cache: runs the hero repo scan and seeds Postgres llm_cache."""

import hashlib
import json
import logging
import os

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

HERO_REPO = os.environ.get("HERO_REPO", "https://github.com/zerodha/kiteconnect-mocks")
API_URL = os.environ.get("API_URL", "http://localhost:8000")


def main() -> None:
    import httpx
    log.info("Pre-warming demo cache for %s", HERO_REPO)

    resp = httpx.post(
        f"{API_URL}/api/v1/scans",
        json={"repo_url": HERO_REPO, "org_id": "demo", "branch": "main"},
        timeout=300,
    )
    resp.raise_for_status()
    scan = resp.json()
    log.info("Scan queued: %s", scan["scan_id"])

    import time
    for _ in range(60):
        time.sleep(5)
        status_resp = httpx.get(f"{API_URL}/api/v1/scans/{scan['scan_id']}", timeout=10)
        status = status_resp.json().get("status")
        log.info("Status: %s", status)
        if status in ("completed", "failed"):
            break

    log.info("Demo cache pre-warmed")


if __name__ == "__main__":
    main()
