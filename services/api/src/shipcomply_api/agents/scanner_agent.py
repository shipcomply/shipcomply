"""Scanner agent — wraps shipcomply_api.scanner.scan_repo."""
from __future__ import annotations

from shipcomply_api.observability.langfuse import traced

import logging

from .state import ScanState

log = logging.getLogger(__name__)


@traced("scanner")
def scanner_node(state: ScanState) -> dict:
    repo_path = state.get("repo_path")
    scan_id = state["scan_id"]

    if not repo_path or state.get("final_status") == "failed":
        return {
            "data_elements": [],
            "files_scanned": 0,
            "step_log": [{"agent": "scanner", "status": "skipped", "message": "no repo_path"}],
        }

    try:
        from shipcomply_api.scanner import scan_repo
        result = scan_repo(repo_path)

        elements = []
        for el in result.data_elements:
            elements.append({
                "element_type": el.element_type,
                "field_name": el.field_name,
                "compliance_flags": el.compliance_flags,
                "sources": [
                    {"file": s.file, "line": s.line, "pattern": s.pattern, "detection_type": s.detection_type}
                    for s in el.sources
                ],
                "sinks": [
                    {"file": s.file, "line": s.line, "pattern": s.pattern, "detection_type": s.detection_type}
                    for s in getattr(el, "sinks", [])
                ],
            })

        return {
            "data_elements": elements,
            "files_scanned": result.files_scanned,
            "step_log": [{"agent": "scanner", "status": "ok", "message": f"found {len(elements)} element types in {result.files_scanned} files"}],
            "errors": result.errors,
        }
    except Exception as exc:
        log.error("scanner_node failed scan=%s: %s", scan_id, exc)
        return {
            "data_elements": [],
            "files_scanned": 0,
            "step_log": [{"agent": "scanner", "status": "error", "message": str(exc)}],
            "errors": [str(exc)],
            "final_status": "failed",
        }
