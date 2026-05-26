"""LegalWriter agent — generates privacy policy using PolicyGenerator."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field as dc_field

from .state import ScanState

log = logging.getLogger(__name__)


@dataclass
class _Src:
    file: str
    line: object = None
    pattern: object = None
    detection_type: str = "pattern"


@dataclass
class _El:
    element_type: str
    field_name: str = ""
    sources: list = dc_field(default_factory=list)
    sinks: list = dc_field(default_factory=list)
    compliance_flags: list = dc_field(default_factory=list)


@dataclass
class _Scan:
    scan_id: str
    data_elements: list
    files_scanned: int = 0
    errors: list = dc_field(default_factory=list)


def _rebuild_scan(state: ScanState) -> _Scan:
    elements = []
    for el in state.get("data_elements", []):
        sources = [_Src(**{k: v for k, v in s.items() if k in ("file","line","pattern","detection_type")}) for s in el.get("sources", [])]
        elements.append(_El(
            element_type=el["element_type"],
            field_name=el.get("field_name", ""),
            compliance_flags=el.get("compliance_flags", []),
            sources=sources,
        ))
    return _Scan(scan_id=state["scan_id"], data_elements=elements, files_scanned=state.get("files_scanned", 0))


def legal_writer_node(state: ScanState) -> dict:
    if state.get("final_status") == "failed":
        return {"policy_markdown": None, "step_log": [{"agent": "legal_writer", "status": "skipped", "message": "upstream failed"}]}

    scan_id = state["scan_id"]
    jurisdiction = state.get("jurisdiction", "DPDP")

    try:
        from shipcomply_api.legal_writer import PolicyGenerator
        from shipcomply_api.llm import llm_client

        mock = _rebuild_scan(state)
        policy = PolicyGenerator(llm_client=llm_client).generate(mock, jurisdiction=jurisdiction)
        md = policy.to_markdown()

        return {
            "policy_markdown": md,
            "step_log": [{"agent": "legal_writer", "status": "ok", "message": f"generated policy: {len(md)} chars, {len(policy.sections)} sections"}],
        }
    except Exception as exc:
        log.error("legal_writer_node failed scan=%s: %s", scan_id, exc)
        return {
            "policy_markdown": None,
            "step_log": [{"agent": "legal_writer", "status": "error", "message": str(exc)}],
            "errors": [f"legal_writer: {exc}"],
        }
