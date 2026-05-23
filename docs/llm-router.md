# LLM Router — Provider Chain and Cache Strategy

## Provider Chain

### Classification / Short Generation (≤4K context)

| Priority | Provider | Limits | Used For |
|----------|----------|--------|---------|
| 1 | Groq (Llama 3.3 70B) | 30 RPM, 6K TPM, 1,000 RPD | Primary: fast, cheap |
| 2 | Cerebras (Llama 3.3 70B) | 30 RPM, 1M tokens/day, **8K ctx cap** | Burst fallback |
| 3 | Ollama (Qwen2.5-Coder 7B) | Unlimited, local | Offline/last resort |

### Long-Context Policy Generation (>8K context)

| Priority | Provider | Limits | Used For |
|----------|----------|--------|---------|
| 1 | Gemini 2.5 Flash | 10 RPM, 500 RPD, 1M ctx | Full RAG + policy gen |
| 2 | Groq chunked-RAG (k=3) | Same as above but 3-chunk context | Fallback |
| 3 | Ollama | Unlimited, local | Offline |

**Important:** Cerebras has an 8,192-token context cap — never use for long-context tasks.

## Cache Strategy

- **Cache key:** SHA-256 of `(provider, model, system_prompt, user_prompt, temperature=0)`
- **TTL:** 24 hours
- **Storage:** Postgres `llm_cache` table
- **Demo prompts:** always `temperature=0` for deterministic caching
- **Pre-warming:** `scripts/prewarm-demo-cache.py` seeds cache on Day-7 morning

## Failure Handling

1. HTTP 429 (rate limit) → immediately route to next provider in chain
2. Any other error → log with warning, route to next provider
3. All providers failed → return structured `LLMUnavailable` error to UI
4. Never fall back to a heuristic that pretends to be an LLM response

## Implementation

See `services/api/src/shipcomply_api/llm/client.py` for the router.
Provider adapters: `llm/providers/{groq,gemini,cerebras,ollama}.py`
