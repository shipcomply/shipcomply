# ShipComply — Feature Catalog

Canonical list of every shipped capability across all distribution surfaces. Last updated: 2026-05-28.

---

## Web App (`shipcomply.vercel.app`)

### Public / Marketing
- Landing page: hero, how-it-works (3 steps), 6 feature cards, stack compatibility chips, CTA sections, footer
- Clerk-hosted signup at `/signup` with branded appearance (dark theme, mint accent)
- Clerk-hosted login at `/login`

### Dashboard (`/dashboard`)
- Scan history list with repo name, jurisdiction, score, status, date
- Stat cards: Total scans, Avg compliance score, Files scanned (all time)
- API-unreachable error banner
- Empty legal corpus warning banner
- First-time onboarding hint with 3 example-repo quick-start chips
- "New scan" CTA button

### New Scan (`/scans/new`)
- 3 preset repo chips (vercel/next.js, supabase/supabase, calcom/cal.com)
- Freeform URL input with regex validation (GitHub, GitLab, Bitbucket HTTPS URLs)
- Jurisdiction selector radio: DPDP Act 2023, GDPR, CCPA/CPRA
- Provisioning retry with toast progress (up to 3 retries on 503)
- Suspense boundary for Next.js static generation compatibility

### Scan Detail (`/scans/[id]`)
- Sticky status badge (queued, running, completed, failed)
- Animated compliance score ring (0-100)
- SSE live progress stream with polling fallback
- PII findings list with severity, element type, regulation refs, affected files
- Download: privacy policy (Markdown)
- Download: audit report (Markdown + PDF)

### Repos (`/repos`)
- GitHub App install CTA linking to `https://github.com/apps/shipcomply/installations/new`
- Empty state pending real repo list

### Team (`/team`)
- Coming-soon empty state with notification on invite attempt

### Knowledge Graph (`/knowledge`)
- Interactive SVG graph: DPDP Act 2023 regulation, sections, data elements, legal bases
- Click to select node, detail card shows type, ID, obligations
- Hover highlight, color legend, keyboard accessible (Tab + Enter)

### Settings, Developers (`/settings`)
- API base URL display
- MCP server JSON config block (copy-paste for Claude Desktop, Cursor, etc.)
- GitHub App install link

### Billing (`/billing`)
- Monthly usage meter (scans used / limit) with progress bar
- Plan comparison: Free (3 scans/month), Team $29/mo, Enterprise custom
- Invoices section

### App Shell
- Desktop sidebar navigation (7 items)
- Mobile drawer navigation with body-scroll lock and Escape key dismiss
- Clerk UserButton for account management
- API warmup banner (shows after 5s if healthz slow, dismissible)

---

## GitHub App (`apps/github-app` — Probot)

Install URL: `https://github.com/apps/shipcomply/installations/new`

On every `pull_request.opened` or `pull_request.synchronize`:
1. Pre-warm API via `GET /healthz`
2. Create GitHub Check Run "ShipComply Compliance Scan" (status: in_progress)
3. POST scan to API with repo URL, org, branch, PR number
4. Fetch audit results
5. Update check run conclusion: `action_required` (HIGH findings) / `success` (score >= 75) / `neutral`
6. Post PR comment with top-5 findings table, score bar, link to full web report
7. On failure: update check run to `failure` with retry guidance

---

## MCP Server (`shipcomply-mcp-server@1.0.1`)

Install: `npx -y shipcomply-mcp-server`
Config: `SHIPCOMPLY_API_KEY` environment variable
Compatible with: Claude Desktop, Cursor, Codex, Antigravity, any MCP 1.0 host

**7 tools:**

| Tool | Description |
|---|---|
| `scan_repo` | Start a compliance scan on a repository URL |
| `get_status` | Poll scan status by scan ID |
| `list_findings` | List all detected PII flows with severity, regulation refs, and affected files |
| `generate_policy` | Generate a privacy policy markdown document |
| `get_audit_md` | Fetch the audit report as Markdown |
| `get_audit_pdf` | Fetch the audit report as PDF |
| `check_file` | Run a single-file compliance check |

---

## Backend API (FastAPI on Render)

Base URL: `https://shipcomply-api.onrender.com`

| Method | Path | Description |
|---|---|---|
| GET | `/healthz` | Health check + readiness |
| GET | `/api/v1/corpus/status` | Check if legal corpus is loaded |
| POST | `/api/v1/scans` | Start a new scan |
| GET | `/api/v1/scans/{id}` | Get scan status + metadata |
| GET | `/api/v1/scans/{id}/audit` | Get audit results (score, findings) |
| GET | `/api/v1/scans/{id}/policy` | Get generated privacy policy |
| GET | `/api/v1/scans/{id}/stream` | SSE stream of scan progress |
| POST | `/api/webhooks/clerk` | Clerk user.created webhook (org provisioning) |
| GET | `/api/webhooks/clerk/health` | Webhook health check |
| POST | `/api/v1/integrations/github` | Register GitHub App installation |

Infrastructure: Groq -> Cerebras -> Gemini 2.5 Flash -> Ollama LLM router, Postgres response cache (24h TTL), pgvector RAG corpus, BGE-small local embeddings, CORS regex whitelist, PII redactor middleware, ephemeral scan workers.

---

## CLI (`apps/cli`) — DEFERRED

Built (Commander + Ink), not yet published to npm. MCP server covers parity for AI coding assistant workflows.

---

## Trust and Compliance

- Every generated artifact prefixed: `AI-GENERATED DRAFT — REVIEW BY QUALIFIED ATTORNEY BEFORE PUBLISHING`
- CLI never uploads raw source code (structured JSON only)
- OAuth tokens stored encrypted in Neon Postgres
- `TESTING.md` documents 3 E2E test paths, smoke curls, troubleshooting matrix
