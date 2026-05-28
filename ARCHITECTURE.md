# ShipComply — Architecture

> Source of truth for system design. Product intent lives in `shipcomply_architecture.md`.

---

## 1. System Overview

```
Browser / CLI / MCP / GitHub App
          │
          ▼
  ┌───────────────┐      Clerk JWTs       ┌─────────┐
  │  Next.js 16   │ ◄──────────────────── │  Clerk  │
  │  (Vercel)     │                       └─────────┘
  └──────┬────────┘
         │  HTTPS + Bearer token
         ▼
  ┌───────────────┐   asyncio tasks    ┌──────────────────────┐
  │  FastAPI      │ ──────────────────►│  LangGraph pipeline  │
  │  (Render)     │                    │  6-agent graph       │
  └──────┬────────┘                    └──────────┬───────────┘
         │                                        │
    ┌────┴────┐                          ┌────────┴────────┐
    │  Neon   │                          │  LLM Providers  │
    │Postgres │                          │  (multi-chain)  │
    └─────────┘                          └────────┬────────┘
         │                                        │
    ┌────┴──────┐                       ┌─────────┴───────┐
    │    R2     │◄──────────────────────│  Artifacts out  │
    │(artifacts)│  policy/audit/kg/code  └─────────────────┘
    └───────────┘
```

---

## 2. Distribution Surfaces

All four fronts hit the same FastAPI core at `services/api/`:

| Surface | Entry | Package |
|---|---|---|
| Web UI | `apps/web/` (Next.js 16 App Router) | deployed on Vercel |
| CLI | `apps/cli/` (Commander + Ink) | `npx shipcomply` |
| MCP server | `apps/` (stdio transport) | `npx shipcomply-mcp-server` |
| GitHub App | `apps/github-app/` (Probot) | installed via GitHub |

---

## 3. Request Lifecycle: `POST /api/v1/scans`

```
User clicks "Start scan"
  -> Clerk JWT attached by apiFetch (lib/api.ts)
  -> FastAPI: auth/deps.py _get_user_org() validates JWT, resolves org row
      -> 409 PROVISIONING if org row not yet created (webhook race)
  -> routes/scans.py create_scan():
      quota check -> idempotency check (SHA-256 key) -> DB insert (status=queued)
      -> asyncio.create_task(_run_scan_pipeline(scan_id))
      -> returns {scan_id} immediately
  -> _run_scan_pipeline():
      updates status=cloning -> calls run_scan(initial_state)
      -> LangGraph ainvoke -> 6-agent pipeline
      -> on completion: R2 uploads -> DB rows -> status=completed
  -> Browser SSE stream: GET /scans/{id}/stream polls DB every 3s
      -> yields data: {scan_id, status} until completed/failed
```

Anchor: `services/api/src/shipcomply_api/routes/scans.py`

---

## 4. Auth + Org Provisioning

- Clerk issues JWTs; FastAPI verifies via `auth/jwt.py`
- Clerk webhook (`/webhooks/clerk`) creates Org row on `organization.created` event
- Race window: JWT arrives before webhook fires -> `_get_user_org` returns 409 `PROVISIONING` with `retry_after=3`
- Frontend `scans/new/page.tsx` retries up to 3x on `ProvisioningError`

Anchor: `services/api/src/shipcomply_api/auth/deps.py:_get_user_org`

---

## 5. Agent Graph

```
cloner -> scanner -> kg_builder -> parallel_gen -> guardrail -> audit -> END
              |                         |
              +-- END (if failed)       +-- legal_writer_node (thread pool)
                                        +-- code_gen_node    (thread pool)
```

- `parallel_gen` uses `asyncio.gather(run_in_executor(...))` for true concurrency
- Each node returns a state delta dict (no in-place mutation)
- `step_log` uses `Annotated[list, _merge_logs]` reducer — appended, not replaced
- Every node is `@traced("name")` — Langfuse span per agent, stderr fallback

Anchor: `services/api/src/shipcomply_api/agents/graph.py`

---

## 6. LLM Router + Cache

Two chains (see `docs/llm-orchestration.md`):

| Chain | Providers | Used for |
|---|---|---|
| SHORT_GEN | Groq -> Cerebras -> NVIDIA -> Zhipu -> Ollama | Classification, code gen (<4K ctx) |
| LONG_GEN | Gemini 2.5 Flash -> DeepSeek -> Kimi -> Groq -> Ollama | Policy generation (>8K ctx) |

- Every 429 routes to next provider
- Cache key: `SHA-256(provider + model + system + user + temperature=0)`, 24h TTL in `llm_cache` table
- `temperature=0` on all deterministic prompts

Anchor: `docs/llm-router.md`

---

## 7. Detection Rules

- Rules live in `packages/detection-rules/rules/v1/`
- Tree-sitter AST walk + regex fallback for TypeScript/JavaScript
- Every rule requires: `fixtures/positive/<rule>.tsx` + `fixtures/negative/<rule>.test.tsx`
- Scanner entrypoint: `services/api/src/shipcomply_api/scanner/__init__.py:scan_repo`

Anchor: `docs/detection-rules.md`

---

## 8. Persistence Map

| Store | What lives there |
|---|---|
| Neon Postgres | Scan, Org, User, Finding, DataElement, AgentRun, LLMCache, CorpusChunk |
| Cloudflare R2 | `scans/<id>/policy.md`, `scans/<id>/audit.md`, `scans/<id>/kg.json`, `scans/<id>/code.json` |

R2 artifacts fetched on demand via `/scans/{id}/policy` and `/scans/{id}/audit`.
Neon stores metadata only — no raw source code ever persists.

---

## 9. Failure-Mode Matrix

| Agent | Failure cause | Scan status | User sees |
|---|---|---|---|
| cloner | git auth error | `failed` | Private repo -> GitHub App CTA |
| cloner | repo >500 MB | `failed` | "Repo too large" message |
| cloner | network timeout | `failed` | Generic retry prompt |
| scanner | tree-sitter parse error | continues | Warning in step_log |
| kg_builder | empty data_elements | continues | Policy uses 0-PII template |
| legal_writer | all LLM providers 429 | `completed_with_errors` | Policy skipped |
| code_gen | all providers fail | `completed_with_errors` | Code artifacts missing |
| guardrail | disclaimer missing | `completed_with_errors` | Guardrail failure flagged |
| R2 upload | S3 error | `completed_with_errors` | Artifact unavailable |

---

## 10. Cost Model

- Free tier: 3 scans / month per org
- LLM cost dominated by LONG_GEN policy generation (~8K-32K tokens)
- Cache hit on identical repo+branch+jurisdiction eliminates LLM cost entirely
- Embeddings: BGE-small-en-v1.5 local CPU — zero API cost

---

## 11. Security Posture

- PII redactor middleware on all loggers (`security/redactor.py`)
- Cloner writes to `/tmp/shipcomply-<scan_id>/`, cleaned in `finally` block
- `_validate_local_path` enforces `examples/` root for local scans
- Repo URL regex restricts to `github.com`, `gitlab.com`, `bitbucket.org` HTTPS only
- OAuth tokens encrypted at rest; never in plain env vars

See `SECURITY.md` for full posture.

---

## 12. Observability

- Langfuse: span per agent via `@traced` decorator, `stderr` fallback
- Render dashboard: service logs, deploy history
- Vercel: build logs, function logs, Web Analytics

---

## 13. Open Architectural Debt

| Issue | Description | Priority |
|---|---|---|
| ARCH-LLM-001 | Prompt prefix caching missing — biggest LLM cost win | High |
| ARCH-KG-001 | KG uses static map, not pgvector — blocks semantic queries | Medium |
| ARCH-AUDIT-001 | Score formula hardcoded — should be config table for A/B | Low |
| — | GitHub App webhook -> LangGraph not wired — PR events don't trigger scans | Medium |
| — | Mobile sidebar <768px not responsive | Low |
| — | Cloner has no CPU/PID resource caps beyond repo size check | Medium |
