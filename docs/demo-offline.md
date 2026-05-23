# Offline Demo — Step-by-Step

Run the full ShipComply pipeline with zero network access.

## Prerequisites

1. Docker running (for local Postgres)
2. Ollama installed: `ollama pull qwen2.5-coder:7b`
3. `.env` has `OFFLINE=true`

## Steps

```bash
# 1. Start local Postgres
docker compose up -d postgres

# 2. Seed DB
psql "postgresql://shipcomply:shipcomply_dev@localhost:5432/shipcomply" -f scripts/seed-supabase.sql

# 3. Boot all services in offline mode
OFFLINE=true pnpm dev

# 4. Run scan (no network)
npx shipcomply scan ./examples/sample-nextjs-app --offline
```

## Verification

- Web dashboard at `http://localhost:3000` shows scan result
- No external HTTP calls made (verify with: `OFFLINE=true pnpm scan:sample 2>&1 | grep -i "groq\|gemini\|cerebras"` — should show nothing)

## Fallback if Ollama is slow

- Pre-cache prompts: `python scripts/prewarm-demo-cache.py` (do this with network first)
- Then disconnect network — responses come from Postgres cache, not Ollama
