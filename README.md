# ShipComply

**Codebase-aware DPDP/GDPR compliance engine.** Scan any repo → detect every PII flow → generate privacy policy, consent banner, deletion endpoints, and audit PDF — in under 5 minutes.

> AI-GENERATED ARTIFACTS ARE DRAFTS — REVIEW BY QUALIFIED ATTORNEY BEFORE PUBLISHING

## What it does

1. **Scan** — tree-sitter AST analysis across TypeScript, JavaScript, Python detects PII collection, storage, and transmission
2. **Map** — builds a Knowledge Graph of data elements, sources, sinks, and third-party SDK flows
3. **Generate** — RAG-backed legal writer produces DPDP/GDPR-compliant privacy policy with file:line citations
4. **Code** — emits working `ConsentBanner.tsx`, `/api/consent`, `/api/user/data` endpoints ready to drop into your repo
5. **Audit** — compliance score + downloadable PDF with evidence trail

## Stack (100% free / open-source)

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 + Tailwind + shadcn/ui → Vercel |
| API | FastAPI (Python 3.12) → Koyeb |
| LLM — short | Groq Llama 3.3 70B → Cerebras → Ollama |
| LLM — long | Gemini 2.5 Flash → Groq chunked → Ollama |
| Embeddings | BGE-small-en-v1.5 (local, CPU) |
| Vector DB | pgvector on Supabase |
| Auth | Supabase Auth (Google + GitHub OAuth) |
| Queue | pg-boss (Postgres-backed) |
| PDF | WeasyPrint |

## Setup

```bash
# Prerequisites: Node 20, pnpm 9, Python 3.12, uv, Docker
git clone https://github.com/shipcomply/shipcomply
cd shipcomply
cp .env.example .env   # fill in your free-tier API keys
pnpm setup             # installs deps, seeds DB, pulls Ollama model
pnpm dev               # boots web (3000), api (8000)
```

## Quick scan

```bash
pnpm scan:sample                                        # bundled sample app
npx shipcomply scan ./path/to/your/repo                # local repo
npx shipcomply scan https://github.com/org/repo        # GitHub repo
npx shipcomply scan ./path/to/repo --offline           # no network needed
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Boot all services |
| `pnpm test` | Run all tests |
| `pnpm scan:sample` | Scan bundled sample app (smoke test) |
| `pnpm corpus:build` | Rebuild RAG corpus from legal sources |
| `pnpm api-client:gen` | Regenerate TS API client from FastAPI OpenAPI |
| `pnpm db:reset` | Reset demo DB from seed fixture |
| `pnpm demo:offline` | Full demo without network |

## Compliance coverage

- **DPDP Act 2023** (India) — enforcement May 2027, up to ₹250 Cr penalties
- **GDPR** (EU) — General Data Protection Regulation
- **CCPA** (California) — Consumer Privacy Act

## License

Apache 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting.
