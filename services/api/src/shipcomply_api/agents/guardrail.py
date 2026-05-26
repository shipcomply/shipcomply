"""Guardrail agent — validates every citation in generated policy resolves to KG node."""
from __future__ import annotations

import logging
import re

from .state import ScanState

log = logging.getLogger(__name__)

_CITATION_RE = re.compile(r"\b(DPDP|GDPR|CCPA)[:\s]+(§?\w[\w.]*)\b")


def guardrail_node(state: ScanState) -> dict:
    policy_md = state.get("policy_markdown") or ""
    jurisdiction = state.get("jurisdiction", "DPDP")

    citations = _CITATION_RE.findall(policy_md)
    if not citations:
        return {
            "guardrail_passed": True,
            "guardrail_violations": [],
            "step_log": [{"agent": "guardrail", "status": "ok", "message": "no citations to validate"}],
        }

    try:
        from shipcomply_api.kg.retriever import KGRetriever
        retriever = KGRetriever()
        violations = []
        for jur, ref in citations:
            if not retriever.validate_citation(ref, jurisdiction=jur):
                violations.append(f"{jur}:{ref}")

        if violations:
            log.warning("guardrail violations scan=%s: %s", state["scan_id"], violations)

        return {
            "guardrail_passed": len(violations) == 0,
            "guardrail_violations": violations,
            "step_log": [{"agent": "guardrail", "status": "ok" if not violations else "warning",
                         "message": f"{len(violations)} unresolvable citations" if violations else "all citations valid"}],
        }
    except Exception as exc:
        log.error("guardrail_node error: %s", exc)
        return {
            "guardrail_passed": False,
            "guardrail_violations": [str(exc)],
            "step_log": [{"agent": "guardrail", "status": "error", "message": str(exc)}],
        }
