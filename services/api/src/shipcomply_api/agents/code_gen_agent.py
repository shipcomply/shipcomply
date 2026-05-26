from shipcomply_api.observability.langfuse import traced
"""CodeGen agent — emits consent banner + Next.js endpoints."""
from __future__ import annotations

import logging

from .state import ScanState
from ._rebuild import rebuild_scan

log = logging.getLogger(__name__)


@traced("code_gen")
def code_gen_node(state: ScanState) -> dict:
    if state.get("final_status") == "failed":
        return {"code_files": [], "step_log": [{"agent": "code_gen", "status": "skipped", "message": "upstream failed"}]}

    scan_id = state["scan_id"]
    data_elements = state.get("data_elements", [])

    try:
        from shipcomply_api.code_gen import CodeGenerator

        mock_scan = rebuild_scan(state)

        result = CodeGenerator().generate(mock_scan)
        code_files = [{"name": f.filename, "content": f.content} for f in result.files]

        return {
            "code_files": code_files,
            "step_log": [{"agent": "code_gen", "status": "ok", "message": f"generated {len(code_files)} files"}],
        }
    except Exception as exc:
        log.warning("code_gen_node failed scan=%s (non-fatal): %s", scan_id, exc)
        return {
            "code_files": [],
            "step_log": [{"agent": "code_gen", "status": "warning", "message": str(exc)}],
        }

