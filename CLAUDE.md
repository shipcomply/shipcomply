# ShipComply — CLAUDE.md

## 1. Mission

ShipComply is a codebase-aware DPDP/GDPR compliance engine that turns source code into compliance artifacts in <5 min. Scans any repo, detects every PII flow via AST analysis, generates: privacy policy with file:line citations, working consent banner + deletion/export endpoints, compliance score, downloadable audit PDF.

## 2. Stack Pins

| Tool | Version |
|------|---------|
| Node | 20 LTS |
| pnpm | 9 |
| Python | 3.12 (via `uv`) |
| Turborepo | 2 |
| Next.js | 16 (App Router) |
| FastAPI | latest |

### LLM Router Rules

**Classification / short generation (≤4K ctx):**
`Groq (Llama 3.3 70B)` → `Cerebras (Llama 3.3 70B)` → `Ollama (Qwen2.5-Coder 7B)`

**Long-context policy generation (>8K ctx):**
`Gemini 2.5 Flash` → `Groq chunked-RAG (k=3)` → `Ollama`

**Embeddings:** BGE-small-en-v1.5 (local, CPU only — never network)

Every 429 routes to next provider. Per-provider token-bucket tracked in Postgres.
Cache key: SHA-256 of `(provider, model, system, user, temperature=0)`. 24h TTL.
If all providers fail → return `LLMUnavailable` error; never fake a response.

## 3. Repo Layout

```
apps/web/          Next.js 16 dashboard + marketing site
apps/cli/          npx shipcomply (Commander + Ink)
apps/github-app/   Probot GitHub App (PR comments, checks)
services/api/      FastAPI backend (scanner, legal writer, code gen, audit)
packages/shared/   Zod schemas + generated OpenAPI TS client (source = FastAPI Pydantic)
packages/detection-rules/  Versioned AST detection rules + fixtures
packages/policy-templates/ Jinja2 privacy policy templates
packages/ui/       shadcn/ui re-exports
corpus/            RAG legal corpus (DPDP, GDPR, CCPA) + pgvector chunks
examples/          Sample repos for smoke testing
scripts/           Build corpus, prewarm cache, generate OpenAPI client, reset DB
tests-e2e/         Playwright tests
```

## 4. Common Commands

```bash
pnpm dev               # boot web + api + cli in parallel via Turbo
pnpm dev:web           # web only (port 3000)
pnpm dev:api           # FastAPI only (port 8000)
pnpm dev:cli           # CLI build watch
pnpm test              # Vitest + pytest
pnpm lint              # ESLint + ruff
pnpm typecheck         # tsc --noEmit + mypy
pnpm scan:sample       # smoke test: scan examples/sample-nextjs-app
pnpm scan:monorepo     # smoke test: scan examples/sample-nextjs-monorepo
pnpm corpus:build      # download + chunk + embed legal texts
pnpm api-client:gen    # FastAPI OpenAPI -> packages/shared/src/api-client/
pnpm db:reset          # restore from scripts/seed-supabase.sql
pnpm demo:offline      # full stack offline (Ollama + local Postgres)
pnpm e2e               # Playwright E2E tests
```

## 5. Code Conventions

- TypeScript strict (`"strict": true`), no `any`, no untyped imports
- Python: ruff + mypy strict, no untyped dicts — use Pydantic models
- Zod at every CLI boundary; Pydantic at every API boundary
- Every detection rule in `packages/detection-rules/rules/v1/` needs:
  - `fixtures/positive/<rule-name>.tsx` — file that SHOULD trigger the rule
  - `fixtures/negative/<rule-name>.test.tsx` — test file that MUST NOT trigger
- API client in `packages/shared/src/api-client/` is GENERATED — edit Pydantic models, run `pnpm api-client:gen`

## 6. Demo Invariants — NEVER BREAK

- `pnpm scan:sample` always succeeds and returns ≥1 data element
- Landing-page "Try Demo" always returns a result (pre-warmed cache)
- CLI runs on Node 18+
- `pnpm demo:offline` runs without any network access
- Compliance score always shows "scanned scope" denominator

## 7. Legal Disclaimer — DO NOT REMOVE

Every generated artifact (privacy policy, consent banner, audit PDF) MUST be prefixed:

```
AI-GENERATED DRAFT — REVIEW BY QUALIFIED ATTORNEY BEFORE PUBLISHING
```

Enforced in `services/api/src/shipcomply_api/legal_writer/` — do not remove.

## 8. LLM Cost Discipline

- Cache every prompt/response pair in Postgres (24h TTL, `llm_cache` table)
- Never call LLM inside a loop — batch all calls
- temperature=0 for all demo prompts (deterministic, cacheable)
- Show free-tier usage meter in dashboard UI

## 9. Self-Privacy Rules

- CLI never uploads raw source code — only structured JSON (element names, paths, line numbers)
- PII redactor middleware on every logger (`security/redactor.py`) — strips emails, phones, names from logs
- OAuth tokens stored via Supabase Vault, never in plain env vars at rest
- API ephemeral worker clones to `/tmp`, wipes on scan completion

## 10. Idempotent Generation

Every generated file carries:
```
// shipcomply-managed: <scan_id>
```
Regen merges via three-way diff against this marker. User edits outside marked blocks are preserved.

## 11. Hook Config Note

`.claude/settings.json` disables `pre:bash:gateguard-fact-force` and `pre:edit-write:gateguard-fact-force` for hackathon velocity. Re-enable post-hackathon. See `SECURITY.md` for rationale.

## 12. References

- `shipcomply_architecture.md` — product spec (source of truth)
- `docs/llm-router.md` — provider chain + cache strategy detail
- `docs/security.md` — self-privacy hygiene detail
- `docs/detection-rules.md` — rule format + fixture specification
- `OPEN-QUESTIONS.md` — live blocker tracker
