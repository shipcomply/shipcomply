from shipcomply_api.observability.langfuse import traced
"""LegalWriter agent — generates privacy policy using PolicyGenerator."""
from __future__ import annotations

import logging

from .state import ScanState
from ._rebuild import rebuild_scan

log = logging.getLogger(__name__)


@traced("legal_writer")
def legal_writer_node(state: ScanState) -> dict:
    if state.get("final_status") == "failed":
        return {"policy_markdown": None, "step_log": [{"agent": "legal_writer", "status": "skipped", "message": "upstream failed"}]}

    scan_id = state["scan_id"]
    jurisdiction = state.get("jurisdiction", "DPDP")

    try:
        from shipcomply_api.legal_writer import PolicyGenerator
        from shipcomply_api.llm import llm_client

        mock = rebuild_scan(state)
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

