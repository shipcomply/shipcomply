"""KG retriever — finds relevant DPDP sections for a list of DataElement types."""
from __future__ import annotations

import logging
from typing import Any

log = logging.getLogger(__name__)

# Static lookup: element_type -> relevant DPDP section identifiers
_ELEMENT_SECTION_MAP: dict[str, list[str]] = {
    "email": ["§4", "§6", "§7"],
    "phone": ["§4", "§6", "§7"],
    "name": ["§4", "§6"],
    "date_of_birth": ["§4", "§9"],
    "biometric": ["§4", "§8", "§11"],
    "financial": ["§4", "§8"],
    "health": ["§4", "§8"],
    "government_id": ["§4", "§8"],
    "location": ["§4", "§6"],
    "password": ["§8", "§11"],
}

_DEFAULT_SECTIONS = ["§4", "§6"]


class KGRetriever:
    def __init__(self, nodes: list[dict[str, Any]] | None = None) -> None:
        self._nodes = {n["identifier"]: n for n in (nodes or [])}

    def get_relevant_sections(self, element_types: list[str]) -> list[dict[str, Any]]:
        """Return KG node dicts for all sections triggered by the given element types."""
        section_ids: set[str] = set()
        for et in element_types:
            section_ids.update(_ELEMENT_SECTION_MAP.get(et, _DEFAULT_SECTIONS))

        results = []
        for sid in section_ids:
            node = self._nodes.get(sid)
            if node:
                results.append(node)
            else:
                results.append({"identifier": sid, "title": f"DPDP {sid}", "body": ""})
        return results

    def validate_citation(self, citation: str) -> bool:
        """Return True if citation resolves to a known KG node."""
        return citation in self._nodes or any(citation in k for k in self._nodes)
