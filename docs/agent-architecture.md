# ShipComply — Agent Architecture

## TL;DR

ShipComply runs a **LangGraph state-machine pipeline** — 6 deterministic agents, 1 shared state object, managed by FastAPI as an async background task. No separate orchestrator process. The graph IS the orchestrator.

---

## 1. Who Manages the Agents?

```
HTTP POST /scans
    └─ FastAPI route handler
         └─ asyncio.create_task(_run_scan_pipeline(...))
              └─ LangGraph compiled graph (run_scan)
                   └─ agents execute in topological order
```

The compiled `StateGraph` manages execution order, conditional routing, and fan-out/fan-in. There is **no separate orchestrator service** — the graph engine is embedded in the FastAPI process. Intentional for hackathon phase: zero additional infra, <5 min scan target.

---

## 2. Agent Graph — Topology

```
                    ┌─────────────────────────────────────────────────┐
                    │              LangGraph StateGraph                │
                    │                                                   │
  POST /scans       │   cloner ──► scanner ──► kg_builder              │
──────────────►     │                               │                  │
                    │                        parallel_gen              │
                    │                       ┌────┴────┐               │
                    │                  legal_writer  code_gen          │
                    │                       └────┬────┘               │
                    │                        guardrail                 │
                    │                            │                     │
                    │                          audit ──► END           │
                    └─────────────────────────────────────────────────┘
```

State: `agents/state.py` | Graph: `agents/graph.py`

---

## 3. What Each Agent Does

### Cloner (`agents/cloner.py`)
- `git clone --depth 1` into `/tmp/shipcomply-<scan_id>/`
- Outputs: `repo_path`, `commit_sha`, `file_list`
- Failure → `final_status=failed` → routes to END immediately
- Cleanup: `cleanup_clone(scan_id)` runs in `finally` after full graph

### Scanner (`agents/scanner_agent.py`)
- Calls `scanner.scan_repo(repo_path)` — tree-sitter AST + regex
- Detects: form inputs, env var leaks, API routes, analytics SDKs, PII field names, cookie reads
- Outputs: `data_elements[]` (element_type, field_name, sources[], sinks[]), `files_scanned`
- `@traced("scanner")` → Langfuse span + latency log

### KG Builder (`agents/kg_builder.py`)
- Maps each detected element to regulation sections via `KGRetriever`
- Outputs: `kg_dict` — `{nodes:[...], edges:[...]}` serialisable graph
  - Node `data_element` — what was found in code
  - Node `section` — DPDP/GDPR/CCPA section that applies
  - Edge `triggers` — element → section
- Example: `email` → `[DPDP:§4, DPDP:§6, DPDP:§7]` + 3 edges
- Persisted: R2 `scans/<id>/kg.json`

### Legal Writer (`agents/legal_writer_agent.py`) — parallel branch
- Builds prompt from data_elements + kg_dict + Jinja2 templates
- Routes to `LONG_GEN` LLM chain (Gemini → DeepSeek → Kimi → Groq → Ollama)
- Outputs: `policy_markdown` — full privacy policy with file:line citations
- Always prefixed: `AI-GENERATED DRAFT — REVIEW BY QUALIFIED ATTORNEY BEFORE PUBLISHING`
- Persisted: R2 `scans/<id>/policy.md`

### Code Gen (`agents/code_gen_agent.py`) — parallel branch
- Generates working TS/Python: consent banner + deletion endpoint + export endpoint
- Routes to `SHORT_GEN` chain (Groq → Cerebras → NVIDIA → Zhipu → Ollama)
- Outputs: `code_files[]` — `[{name, content}]`
- Persisted: R2 `scans/<id>/code.json`

### Guardrail (`agents/guardrail.py`)
- Checks generated output: disclaimer present, no hardcoded PII, policy cites ≥1 section, no malicious patterns in code snippets
- Outputs: `guardrail_passed: bool`, `guardrail_violations: []`
- Violations → score penalty in audit; scan still completes

### Audit (`agents/audit_agent.py`)
- Calculates `compliance_score` 0–100 from element types + guardrail + citation coverage
- Generates `findings[]` — per-element severity + recommendation
- Writes `audit_markdown` — downloadable report
- Persisted: R2 `scans/<id>/audit.md`; Finding rows to Neon DB

---

## 4. Shared State (ScanState TypedDict)

```python
# Identity
scan_id, repo_url, branch, jurisdiction, offline

# Cloner → Scanner → KG → Legal/Code → Guardrail → Audit
repo_path, commit_sha, file_list
data_elements[], files_scanned
kg_dict
policy_markdown, policy_r2_key
code_files[]
guardrail_passed, guardrail_violations[]
audit_markdown, compliance_score, findings[]

# Accumulators (fan-in safe — merge reducer)
step_log: Annotated[list[StepLog], _merge_logs]
errors: list[str]
final_status: "completed" | "failed"
```

---

## 5. Fan-Out / Fan-In (Parallel Execution)

`parallel_gen` node runs `legal_writer_node` + `code_gen_node` via `asyncio.gather` + `run_in_executor`. Separate state keys → no collision. Logs merged via `Annotated[list, _merge_logs]` reducer.

Target: `legal_writer` + `code_gen` total ≤ 8s (longest leg).

---

## 6. Scan Status Lifecycle

```
queued → cloning → scanning → generating → completed
                                         ↘ failed
                                         ↘ completed_with_errors
```

Real-time: `GET /scans/<id>/stream` — SSE, polls DB every 3s, max 6 min.

---

## 7. Observability Per Agent

`@traced(agent_name)` on every node:

```
agent=cloner        status=ok  latency_ms=2341
agent=scanner       status=ok  latency_ms=891
agent=kg_builder    status=ok  latency_ms=44
agent=legal_writer  status=ok  latency_ms=3102   ← Langfuse span if configured
agent=code_gen      status=ok  latency_ms=1876
agent=guardrail     status=ok  latency_ms=12
agent=audit         status=ok  latency_ms=2018
```

Langfuse emits traces if `LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY` set. Falls back to stderr.

---

## 8. Artifact Storage — Cloudflare R2

All generated artifacts → R2 (not Neon — Neon stores only metadata rows):

| Artifact | R2 Key | Endpoint |
|----------|--------|----------|
| Privacy Policy | `scans/<id>/policy.md` | `GET /scans/<id>/policy` |
| Audit Report | `scans/<id>/audit.md` | `GET /scans/<id>/audit` |
| Knowledge Graph | `scans/<id>/kg.json` | `GET /scans/<id>/graph` |
| Code Files | `scans/<id>/code.json` | `GET /scans/<id>/code` |

R2 chosen because Neon already hosts 2 projects and blob storage does not belong in a relational DB.

---

## 9. Build Status

| Component | Status | Notes |
|-----------|--------|-------|
| LangGraph graph topology | ✅ Built | `agents/graph.py` |
| ScanState TypedDict | ✅ Built | `agents/state.py` |
| Scanner agent | ✅ Built | tree-sitter + regex |
| KG Builder agent | ✅ Built | static map (pgvector next) |
| Guardrail agent | ✅ Built | 4 checks |
| Legal Writer agent | ✅ Built | prompt tuning needed |
| Code Gen agent | ✅ Built | prompt tuning needed |
| Audit agent | ✅ Built | scoring formula tunable |
| Cloner (git) | ⚠️ Partial | sandbox hardening needed |
| R2 artifact upload | ✅ Built | `storage/r2.py` |
| Neon DB persistence | ✅ Built | `db/models.py` |
| SSE streaming | ✅ Built | `routes/scans.py` |
| Prompt prefix caching | ❌ Missing | see llm-orchestration.md |
| DPDP KG from pgvector | ❌ Missing | static map only now |
| GitHub webhook → graph | ❌ Missing | not wired yet |
