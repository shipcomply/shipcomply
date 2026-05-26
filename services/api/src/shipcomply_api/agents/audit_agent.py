"""Audit agent — scoring + markdown report, persists findings."""
from __future__ import annotations

import logging

from .state import ScanState

log = logging.getLogger(__name__)


def audit_node(state: ScanState) -> dict:
    if state.get("final_status") == "failed":
        return {
            "audit_markdown": None,
            "compliance_score": 0.0,
            "findings": [],
            "step_log": [{"agent": "audit", "status": "skipped", "message": "upstream failed"}],
        }

    scan_id = state["scan_id"]
    repo_path = state.get("repo_path", "")

    try:
        from shipcomply_api.scanner import scan_repo
        from shipcomply_api.audit import AuditAgent

        result = scan_repo(repo_path)
        report = AuditAgent().audit(result)
        md = report.to_markdown()

        raw_findings = getattr(report, "findings", [])
        findings = [
            {
                "severity": getattr(f, "severity", "INFO"),
                "title": getattr(f, "title", "")[:512],
                "detail": getattr(f, "detail", "") or "",
                "file_path": getattr(f, "file_path", None),
                "line_number": getattr(f, "line_number", None),
                "regulation": getattr(f, "regulation", None),
            }
            for f in raw_findings
        ]

        return {
            "audit_markdown": md,
            "compliance_score": float(getattr(report, "score", 0)),
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
