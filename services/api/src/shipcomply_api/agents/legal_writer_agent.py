"""LegalWriter agent — generates privacy policy via PolicyGenerator + LLM."""
from __future__ import annotations

import logging

from .state import ScanState

log = logging.getLogger(__name__)


def legal_writer_node(state: ScanState) -> dict:
    if state.get("final_status") == "failed":
        return {"policy_markdown": None, "step_log": [{"agent": "legal_writer", "status": "skipped", "message": "upstream failed"}]}

    scan_id = state["scan_id"]
    repo_path = state.get("repo_path", "")
    jurisdiction = state.get("jurisdiction", "DPDP")

    try:
        from shipcomply_api.scanner import scan_repo
        from shipcomply_api.legal_writer import PolicyGenerator
        from shipcomply_api.llm import llm_client

        result = scan_repo(repo_path)
        policy = PolicyGenerator(llm_client=llm_client).generate(result, jurisdiction=jurisdiction)
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
