"""Loader for versioned JSON detection rules — replaces hard-coded PII_FIELD_MAP in scanner."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

_RULES_DIR = Path(__file__).parent.parent / "rules" / "v1"


def _load_rules() -> dict[str, dict[str, Any]]:
    rules: dict[str, dict[str, Any]] = {}
    for rule_file in _RULES_DIR.glob("*.json"):
        with open(rule_file, encoding="utf-8") as f:
            rule = json.load(f)
        rule_id = rule.get("id") or rule_file.stem
        rules[rule_id] = rule
    return rules


# Loaded once at import time; reload by calling _load_rules() directly.
DETECTION_RULES: dict[str, dict[str, Any]] = _load_rules()


def get_pii_field_map() -> dict[str, list[str]]:
    """Return a {element_type: [field_name_patterns]} map compatible with scanner._regex_scan."""
    pii_map: dict[str, list[str]] = {}
    for rule_id, rule in DETECTION_RULES.items():
        patterns = []
        for p in rule.get("patterns", []):
            if p.get("type") == "identifier":
                name_pattern = p.get("name_pattern", "")
                patterns.extend(name_pattern.split("|"))
        pii_map[rule_id] = patterns
    return pii_map


def get_compliance_flags(rule_id: str) -> list[str]:
    return DETECTION_RULES.get(rule_id, {}).get("compliance_flags", [])
