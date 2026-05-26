"""Seed KG from JSON snapshots stored in R2 or bundled as fixtures."""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

_FIXTURE_PATH = Path(__file__).parent.parent.parent.parent.parent / "corpus" / "dpdp-kg-seed.json"


def load_kg_nodes() -> list[dict[str, Any]]:
    """Load DPDP KG nodes from fixture file. Returns empty list if file missing."""
    if not _FIXTURE_PATH.exists():
        log.info("KG fixture not found at %s — run scripts/build-dpdp-kg.py to generate", _FIXTURE_PATH)
        return []
    try:
        data = json.loads(_FIXTURE_PATH.read_text())
        return data.get("nodes", [])
    except Exception as exc:
        log.warning("Failed to load KG fixture: %s", exc)
        return []
