"""KG retriever — finds relevant regulation sections for detected DataElement types."""
from __future__ import annotations

import logging
from typing import Any

log = logging.getLogger(__name__)

_DPDP_MAP: dict[str, list[str]] = {
    "email": ["DPDP:§4", "DPDP:§6", "DPDP:§7"],
    "phone": ["DPDP:§4", "DPDP:§6", "DPDP:§7"],
    "name": ["DPDP:§4", "DPDP:§6"],
    "date_of_birth": ["DPDP:§4", "DPDP:§9"],
    "biometric": ["DPDP:§4", "DPDP:§8", "DPDP:§11"],
    "financial": ["DPDP:§4", "DPDP:§8"],
    "health": ["DPDP:§4", "DPDP:§8"],
    "government_id": ["DPDP:§4", "DPDP:§8"],
    "location": ["DPDP:§4", "DPDP:§6"],
    "password": ["DPDP:§8", "DPDP:§11"],
}

_GDPR_MAP: dict[str, list[str]] = {
    "email": ["GDPR:Art6", "GDPR:Art13"],
    "phone": ["GDPR:Art6", "GDPR:Art13"],
    "name": ["GDPR:Art6", "GDPR:Art13"],
    "date_of_birth": ["GDPR:Art9", "GDPR:Art13"],
    "biometric": ["GDPR:Art9"],
    "financial": ["GDPR:Art6", "GDPR:Art9"],
    "health": ["GDPR:Art9"],
    "government_id": ["GDPR:Art87"],
    "location": ["GDPR:Art6", "GDPR:Art13"],
    "password": ["GDPR:Art32"],
}

_CCPA_MAP: dict[str, list[str]] = {
    "email": ["CCPA:1798.100", "CCPA:1798.120"],
    "phone": ["CCPA:1798.100", "CCPA:1798.120"],
    "name": ["CCPA:1798.100"],
    "date_of_birth": ["CCPA:1798.100"],
    "biometric": ["CCPA:1798.140"],
    "financial": ["CCPA:1798.140"],
    "health": ["CCPA:1798.140"],
    "location": ["CCPA:1798.100"],
    "password": ["CCPA:1798.150"],
}

_JURISDICTION_MAP = {"DPDP": _DPDP_MAP, "GDPR": _GDPR_MAP, "CCPA": _CCPA_MAP}
_DEFAULT_REFS = {"DPDP": ["DPDP:§4", "DPDP:§6"], "GDPR": ["GDPR:Art6"], "CCPA": ["CCPA:1798.100"]}


class KGRetriever:
    def __init__(self, nodes: list[dict[str, Any]] | None = None) -> None:
        # Index by "jurisdiction:identifier" key for exact lookup
        self._nodes: dict[str, dict[str, Any]] = {}
        for n in (nodes or []):
            key = f"{n.get('jurisdiction', 'DPDP')}:{n['identifier']}"
            self._nodes[key] = n

    def get_relevant_sections(
        self, element_types: list[str], jurisdiction: str = "DPDP"
    ) -> list[dict[str, Any]]:
        """Return KG nodes for sections triggered by element_types under the given jurisdiction."""
        section_map = _JURISDICTION_MAP.get(jurisdiction, _DPDP_MAP)
        defaults = _DEFAULT_REFS.get(jurisdiction, ["DPDP:§4"])
        ref_ids: set[str] = set()
        for et in element_types:
            ref_ids.update(section_map.get(et, defaults))

        results = []
        for ref in ref_ids:
            node = self._nodes.get(ref)
            if node:
                results.append(node)
            else:
                # Placeholder so callers always get a node per reference
                jur, ident = ref.split(":", 1) if ":" in ref else (jurisdiction, ref)
                results.append({"identifier": ident, "jurisdiction": jur, "title": f"{jur} {ident}", "body": ""})
        return results

    def validate_citation(self, citation: str, jurisdiction: str = "DPDP") -> bool:
        """Return True only on exact identifier match (no substring)."""
        key = f"{jurisdiction}:{citation}"
        return key in self._nodes or citation in self._nodes
