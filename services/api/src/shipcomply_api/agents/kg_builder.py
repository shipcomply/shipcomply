"""KGBuilder agent — builds scan knowledge graph + links elements to DPDP KG."""
from __future__ import annotations

import json
import logging

from .state import ScanState

log = logging.getLogger(__name__)


def kg_builder_node(state: ScanState) -> dict:
    if state.get("final_status") == "failed":
        return {"kg_dict": None, "step_log": [{"agent": "kg_builder", "status": "skipped", "message": "upstream failed"}]}

    repo_path = state.get("repo_path", "")
    scan_id = state["scan_id"]
    try:
        from shipcomply_api.scanner import scan_repo
        from shipcomply_api.scanner.knowledge_graph import build_graph

        result = scan_repo(repo_path)
        graph = build_graph(result)
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
