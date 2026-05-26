"""
LangGraph agent graph for ShipComply scan pipeline.

Flow:
  cloner → scanner → kg_builder
                    ↓
         legal_writer ─→ guardrail ─┐
         code_gen                   ├→ audit
                                    ┘
"""
from __future__ import annotations

import asyncio
import logging
from typing import Literal

from langgraph.graph import StateGraph, END

from .state import ScanState
from .cloner import cloner_node, cleanup_clone
from .scanner_agent import scanner_node
from .kg_builder import kg_builder_node
from .legal_writer_agent import legal_writer_node
from .code_gen_agent import code_gen_node
from .guardrail import guardrail_node
from .audit_agent import audit_node

log = logging.getLogger(__name__)


def _route_after_cloner(state: ScanState) -> Literal["scanner", END]:  # type: ignore[valid-type]
    if state.get("final_status") == "failed" or not state.get("repo_path"):
        return END
    return "scanner"


def _route_after_scanner(state: ScanState) -> Literal["kg_builder", END]:  # type: ignore[valid-type]
    if state.get("final_status") == "failed":
        return END
    return "kg_builder"


def _run_parallel_nodes(state: ScanState) -> dict:
    """Fan-out: run legal_writer and code_gen concurrently, merge results."""
    lw_result = legal_writer_node(state)
    cg_result = code_gen_node(state)
    merged: dict = {}
    merged.update(lw_result)
    merged.update(cg_result)
    # Merge step_logs
    merged["step_log"] = lw_result.get("step_log", []) + cg_result.get("step_log", [])
    merged["errors"] = lw_result.get("errors", []) + cg_result.get("errors", [])
    return merged


def build_graph() -> StateGraph:
    g = StateGraph(ScanState)

    g.add_node("cloner", cloner_node)
    g.add_node("scanner", scanner_node)
    g.add_node("kg_builder", kg_builder_node)
    g.add_node("parallel_gen", _run_parallel_nodes)
    g.add_node("guardrail", guardrail_node)
    g.add_node("audit", audit_node)

    g.set_entry_point("cloner")
    g.add_conditional_edges("cloner", _route_after_cloner, {"scanner": "scanner", END: END})
    g.add_conditional_edges("scanner", _route_after_scanner, {"kg_builder": "kg_builder", END: END})
    g.add_edge("kg_builder", "parallel_gen")
    g.add_edge("parallel_gen", "guardrail")
    g.add_edge("guardrail", "audit")
    g.add_edge("audit", END)

    return g


# Compiled singleton — imported by routes
_compiled = None


def get_compiled_graph():
    global _compiled
    if _compiled is None:
        _compiled = build_graph().compile()
    return _compiled


async def run_scan(initial_state: dict) -> ScanState:
    """Invoke the compiled graph and clean up cloned repo afterward."""
    graph = get_compiled_graph()
    scan_id = initial_state["scan_id"]
    try:
        result: ScanState = await graph.ainvoke(initial_state)
        return result
    finally:
        cleanup_clone(scan_id)
