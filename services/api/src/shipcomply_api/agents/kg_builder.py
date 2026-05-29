"""KGBuilder agent — builds scan knowledge graph from state data_elements."""
from __future__ import annotations

from shipcomply_api.observability.langfuse import traced

import logging

from .state import ScanState
from ._rebuild import rebuild_scan

log = logging.getLogger(__name__)


@traced("kg_builder")
def kg_builder_node(state: ScanState) -> dict:
    if state.get("final_status") == "failed":
        return {"kg_dict": None, "step_log": [{"agent": "kg_builder", "status": "skipped", "message": "upstream failed"}]}

    scan_id = state["scan_id"]
    try:
        from shipcomply_api.scanner.knowledge_graph import build_graph
        mock = rebuild_scan(state)
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

