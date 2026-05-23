# ShipComply — Offline Demo Guide

Use this when conference wifi dies or you want a zero-network demo.

## Prerequisites (set up once before the demo)

```bash
# 1. Install Ollama
# macOS:  brew install ollama
# Linux:  curl -fsSL https://ollama.com/install.sh | sh
# Windows: https://ollama.com/download

# 2. Pull the offline model (~4 GB)
ollama pull qwen2.5-coder:7b

# 3. Start local Postgres (Docker required)
docker compose up -d postgres

# 4. Install Python deps
cd services/api && uv pip install -e ".[dev]"
```

## Running the offline demo

Open **three terminals**:

### Terminal 1 — API (offline mode)
```bash
cd services/api
OFFLINE=true DATABASE_URL=postgresql://shipcomply:shipcomply@localhost:5432/shipcomply_dev \
  uvicorn shipcomply_api.main:app --reload --port 8000
```

### Terminal 2 — Web dashboard
```bash
cd apps/web
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 \
NEXT_PUBLIC_API_URL=http://localhost:8000 \
  pnpm dev
```

### Terminal 3 — Run the demo scan
```bash
# Scan the pinned sample app (no internet needed)
node apps/cli/bin/shipcomply.js scan ./examples/sample-nextjs-app --offline \
  --api-url http://localhost:8000

# Or use the pnpm shortcut
OFFLINE=true pnpm scan:sample
```

## One-command offline boot
```bash
pnpm demo:offline
# Equivalent to: OFFLINE=true turbo dev
```

## Verify offline before disabling wifi

Run this checklist with wifi **on**, then **off**:

```bash
# 1. Check Ollama is running
curl http://localhost:11434/api/version

# 2. Check API health
curl http://localhost:8000/health

# 3. Run full pipeline offline
OFFLINE=true python scripts/gen_policy.py examples/sample-nextjs-app
OFFLINE=true python scripts/gen_audit.py examples/sample-nextjs-app

# 4. Open dashboard
open http://localhost:3000
```

## Offline LLM router behaviour

With `OFFLINE=true`, the LLM client skips Groq / Gemini / Cerebras entirely
and routes all requests directly to Ollama at `http://localhost:11434`.
Policy generation is slower (~15 s per section) but deterministic.

## Demo cache (fastest path)

If you ran `python scripts/prewarm-demo-cache.py` before the demo, all policy
sections are pre-generated and served from the `llm_cache` Postgres table —
Ollama is not called at all. This is the fastest demo path:

```bash
# Pre-warm (run once while online, Day-7 morning)
python scripts/prewarm-demo-cache.py --path examples/sample-nextjs-app

# Then demo offline — cache hit on every section
OFFLINE=true pnpm scan:sample
```

## Recovery if something breaks

| Symptom | Fix |
|---------|-----|
| Ollama not responding | `ollama serve` in a new terminal |
| Postgres connection refused | `docker compose up -d postgres` |
| API 500 on /scans/local | Check `services/api/.env` has `DATABASE_URL` |
| Web blank screen | Check `NEXT_PUBLIC_API_URL=http://localhost:8000` in `apps/web/.env.local` |
| Model not found | `ollama pull qwen2.5-coder:7b` |
