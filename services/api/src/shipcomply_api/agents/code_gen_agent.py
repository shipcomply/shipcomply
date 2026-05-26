"""CodeGen agent — emits consent banner + Next.js endpoints."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

from .state import ScanState

log = logging.getLogger(__name__)


@dataclass
class _MinimalElement:
    element_type: str
    field_name: str = ""
    sources: list = field(default_factory=list)
    sinks: list = field(default_factory=list)
    compliance_flags: list = field(default_factory=list)


@dataclass
class _MinimalScan:
    scan_id: str
    data_elements: list
    files_scanned: int = 0
    errors: list = field(default_factory=list)


def code_gen_node(state: ScanState) -> dict:
    if state.get("final_status") == "failed":
        return {"code_files": [], "step_log": [{"agent": "code_gen", "status": "skipped", "message": "upstream failed"}]}

    scan_id = state["scan_id"]
    data_elements = state.get("data_elements", [])

    try:
        from shipcomply_api.code_gen import CodeGenerator

        elements = [
            _MinimalElement(
                element_type=el["element_type"],
                field_name=el.get("field_name", ""),
                compliance_flags=el.get("compliance_flags", []),
            )
            for el in data_elements
        ]
        mock_scan = _MinimalScan(scan_id=scan_id, data_elements=elements)

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
