from shipcomply_api.observability.langfuse import traced
"""Audit agent — scoring + markdown report from state data_elements."""
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


@traced("audit")
def audit_node(state: ScanState) -> dict:
    if state.get("final_status") == "failed":
        return {
            "audit_markdown": None,
            "compliance_score": 0.0,
            "findings": [],
            "step_log": [{"agent": "audit", "status": "skipped", "message": "upstream failed"}],
        }

    scan_id = state["scan_id"]
    try:
        from shipcomply_api.audit import AuditAgent

        mock = _rebuild_scan(state)
        report = AuditAgent().audit(mock)
        md = report.to_markdown()

        findings = [
            {
                "severity": f.severity,
                "title": f"{f.element_type.upper()} data detected",
                "detail": f.description,
                "file_path": f.affected_files[0].split(":")[0] if f.affected_files else None,
                "line_number": None,
                "regulation": ", ".join(f.regulation_refs[:2]),
            }
            for f in report.findings
        ]

        return {
            "audit_markdown": md,
            "compliance_score": float(report.score or 0),
            "findings": findings,
            "final_status": "completed",
            "step_log": [{"agent": "audit", "status": "ok", "message": f"score={report.score}, findings={len(findings)}"}],
        }
    except Exception as exc:
        log.error("audit_node failed scan=%s: %s", scan_id, exc)
        return {
            "audit_markdown": None,
            "compliance_score": 0.0,
            "findings": [],
            "final_status": "failed",
            "step_log": [{"agent": "audit", "status": "error", "message": str(exc)}],
            "errors": [str(exc)],
        }

