"""
Cloudflare Browser Rendering client — converts HTML to PDF via CF Workers API.
Falls back to plain HTML bytes if CF_BROWSER_RENDERING_URL not configured.
"""
from __future__ import annotations

import logging
import os

import httpx

log = logging.getLogger(__name__)

_CF_URL = os.getenv("CF_BROWSER_RENDERING_URL", "")


async def html_to_pdf(html: str, scan_id: str) -> bytes:
    if not _CF_URL:
        log.warning("CF_BROWSER_RENDERING_URL not set — returning HTML bytes")
        return html.encode()
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                _CF_URL,
                json={"html": html, "scan_id": scan_id},
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
            return resp.content
    except Exception as exc:
        log.error("CF Browser Rendering failed scan=%s: %s", scan_id, exc)
        raise RuntimeError(f"PDF render failed: {exc}") from exc
