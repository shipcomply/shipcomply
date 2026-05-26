from shipcomply_api.observability.langfuse import traced
"""KGBuilder agent — builds scan knowledge graph from state data_elements."""
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


@traced("kg_builder")
def kg_builder_node(state: ScanState) -> dict:
    if state.get("final_status") == "failed":
        return {"kg_dict": None, "step_log": [{"agent": "kg_builder", "status": "skipped", "message": "upstream failed"}]}

    scan_id = state["scan_id"]
    try:
        from shipcomply_api.scanner.knowledge_graph import build_graph
        mock = _rebuild_scan(state)
        graph = build_graph(mock)
        kg_dict = graph.to_dict()

        return {
            "kg_dict": kg_dict,
            "step_log": [{"agent": "kg_builder", "status": "ok", "message": f"built KG with {len(kg_dict.get('nodes', []))} nodes"}],
        }
    except Exception as exc:
        log.warning("kg_builder_node failed scan=%s (non-fatal): %s", scan_id, exc)
        return {
            "kg_dict": {},
            "step_log": [{"agent": "kg_builder", "status": "warning", "message": str(exc)}],
        }

