"""ScanState — shared state carried through the LangGraph agent graph."""
from __future__ import annotations

from typing import Annotated, Any, Optional
from typing_extensions import TypedDict
import operator


class StepLog(TypedDict):
    agent: str
    status: str
    message: str


def _merge_logs(left: list[StepLog], right: list[StepLog]) -> list[StepLog]:
    return left + right


class ScanState(TypedDict):
    # Identity
    scan_id: str
    repo_url: str
    branch: str
    jurisdiction: str
    offline: bool

    # Set by Cloner
    repo_path: Optional[str]
    commit_sha: Optional[str]
    file_list: list[str]

    # Set by Scanner
    data_elements: list[dict[str, Any]]   # serialised DataElement dicts
    files_scanned: int

    # Set by KGBuilder
    kg_dict: Optional[dict[str, Any]]

    # Set by LegalWriter (parallel)
    policy_markdown: Optional[str]
    policy_r2_key: Optional[str]

    # Set by CodeGen (parallel)
    code_files: list[dict[str, str]]   # [{name, content}]

    # Set by Guardrail
    guardrail_passed: bool
    guardrail_violations: list[str]

    # Set by Audit
    audit_markdown: Optional[str]
    audit_r2_key: Optional[str]
    compliance_score: float
    findings: list[dict[str, Any]]

    # Accumulator (fan-in)
    step_log: Annotated[list[StepLog], _merge_logs]
    errors: list[str]
    final_status: str   # "completed" | "failed"
