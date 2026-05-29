"""Audit agent — scoring + markdown report from state data_elements."""
from __future__ import annotations

from shipcomply_api.observability.langfuse import traced

import logging

from .state import ScanState
from ._rebuild import rebuild_scan

log = logging.getLogger(__name__)


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

        mock = rebuild_scan(state)
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
            "final_status": "completed_with_errors" if state.get("errors") else "completed",
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

