# ShipComply — LLM Orchestration

## Overview

All LLM calls go through a single `LLMClient` singleton in `services/api/src/shipcomply_api/llm/client.py`. It handles provider routing, circuit breaking, rate limiting, caching, and observability — no direct provider calls anywhere else.

---

## 1. Provider Chain by Task Type

### SHORT_GEN (classification, code snippets, ≤4K ctx)
```
Groq (Llama 3.3 70B)
  → Cerebras (Llama 3.3 70B)
  → NVIDIA NIM (Llama 3.1 70B)
  → Zhipu (GLM-4-Flash)
  → Ollama (Qwen2.5-Coder:7B) — local fallback
```

### LONG_GEN (policy generation, >8K ctx)
```
Gemini 2.5 Flash (1M ctx window)
  → DeepSeek V3 (128K ctx, near-free pricing)
  → Kimi / Moonshot (256K ctx)
  → Groq (chunked, k=3 RAG to fit context)
  → Ollama (local fallback)
```

---

## 2. Provider Free-Tier Details

| Provider | Model | Free Limit | Daily Cap (80%) | RPM Cap (80%) | Notes |
|----------|-------|------------|-----------------|---------------|-------|
| **Groq** | Llama 3.3 70B | 14,400 req/day | 11,500 | 24 RPM | Best free classification speed |
| **Cerebras** | Llama 3.3 70B | ~500 req/day | 400 | 24 RPM | Wafer-scale, fastest tokens/s |
| **Gemini** | 2.5 Flash | 500 req/day | 400 | 8 RPM | 1M ctx, best for long policy gen |
| **NVIDIA NIM** | Llama 3.1 70B | 1,000 req/day | 800 | 40 RPM | Sign up: build.nvidia.com |
| **DeepSeek** | V3 (Chat) | ~5M tokens/day free | 5,000,000 tok | 60 RPM | $0.014/1M input in prod |
| **Zhipu** | GLM-4-Flash | ~999,999 tokens free | 999,999 | 60 RPM | register.zhipuai.cn |
| **Kimi** | Moonshot v1 | trial credits | 800 | 60 RPM | 256K context window |
| **Ollama** | Qwen2.5-Coder:7B | unlimited | unlimited | unlimited | Local only |

### NVIDIA NIM Setup
1. Sign up → `build.nvidia.com` → "NVIDIA NIM" → generate API key
2. Set `NVIDIA_API_KEY=nvapi-...`
3. Provider uses OpenAI-compatible endpoint `https://integrate.api.nvidia.com/v1`
4. Best free models: `meta/llama-3.1-70b-instruct`, `nvidia/llama-3.1-nemotron-70b-instruct`
5. 1,000 free inference credits/day → 800 capped

### Chinese Providers — Why Use Them
- **DeepSeek V3**: Technically rivals GPT-4o at ~1/20th price. Auto prefix-caching on all prompts >64 tokens. Primary LONG_GEN fallback after Gemini.
- **Zhipu GLM-4-Flash**: Free tier essentially unlimited for small requests. Excellent SHORT_GEN fallback when Groq hits RPM. Chinese servers — latency ~200ms to India.
- **Kimi (Moonshot)**: 256K context window means entire large codebases fit without chunking. Free trial credits cover hackathon volume.
- **Qwen2.5 (future)**: Add via Alibaba DashScope API — OpenAI-compatible, similar free tier to Zhipu. Add as 5th SHORT_GEN provider.

---

## 3. Guardrails Stack (per call)

```
1. OFFLINE check        → route to Ollama immediately if settings.offline
2. Cache check          → SHA-256(task+system+user) → return if hit (24h TTL)
3. Circuit breaker      → skip provider if open (3 failures → 5 min blackout)
4. BudgetGuard.acquire  → check daily cap + token bucket RPM
5. Provider HTTP call
6. Success              → record_success, write cache, return
7. ProviderBudgetExceeded → next provider silently
8. Any Exception        → record_failure (circuit counter++), next provider
9. All fail             → raise LLMUnavailable — never fake a response
```

### Circuit Breaker
```
FAIL_THRESHOLD = 3 consecutive failures
RESET_AFTER_S  = 300 (5 min)
```

### Token Bucket (in-memory per provider)
```
Refills at rpm_cap/60 tokens/second continuously
async Lock prevents concurrent over-spend
Daily counter resets at date boundary
```

Multi-worker note: in-memory = per-worker. Render free tier = 1 worker. For multi-worker: persist buckets to Cloudflare KV.

---

## 4. Response Cache

```python
TTL = 86_400 seconds (24h)
key = SHA-256(json.dumps({task, system, user}, sort_keys=True))
```

- In-memory (process lifetime only)
- `temperature=0` on all calls → deterministic → high hit rate for repeated demo scans
- **Gap**: Not persisted across restarts. Next: write to Neon `llm_cache` table with TTL column.

---

## 5. Prompt Prefix Caching (Provider-Level)

**Status: NOT implemented**

| Provider | Supports Prefix Cache | How |
|----------|----------------------|-----|
| Gemini 2.5 Flash | ✅ Yes | `cachedContent` API for prompts >32K tokens |
| DeepSeek V3 | ✅ Automatic | Built-in for prompts >64 tokens — no config needed |
| Groq | ❌ No | Not supported |
| Cerebras | ❌ No | Not supported |
| NVIDIA NIM | ❌ Free tier no | Enterprise tier only |
| Ollama | ✅ Automatic | llama.cpp KV cache |

**Plan** for Gemini prefix caching (saves ~60% tokens on repeated policy calls):
```python
# Cache the regulation corpus system prompt once per 24h
cached = genai.create_cached_content(
    model="gemini-2.5-flash-preview",
    contents=[corpus_system_prompt],  # ~20K tokens, reused across all scans
    ttl=datetime.timedelta(hours=24),
)
# Pass cached.name to each generation call
```

DeepSeek prefix caching is automatic — already benefiting on every call with shared system prompt prefix.

---

## 6. LLM Usage Per Agent

| Agent | Task Type | Primary Provider | Typical Prompt Size |
|-------|-----------|-----------------|---------------------|
| Scanner | None | — | No LLM, pure AST |
| KG Builder | None | — | No LLM, static map |
| Legal Writer | LONG_GEN | Gemini 2.5 Flash | 8K–40K tokens |
| Code Gen | SHORT_GEN | Groq Llama 3.3 70B | 1K–4K tokens |
| Guardrail | SHORT_GEN | Groq | 500–2K tokens |
| Audit | SHORT_GEN | Groq | 2K–6K tokens |

---

## 7. Offline Mode

`OFFLINE=true` → all LLM calls route directly to Ollama, bypassing cloud entirely.
Required for `pnpm demo:offline`.

---

## 8. Usage Dashboard API

`GET /api/llm/usage` returns real-time provider stats:
```json
{
  "cache_entries": 42,
  "providers": [
    {"provider": "groq", "daily_used": 234, "daily_cap": 11500, "daily_remaining": 11266},
    {"provider": "gemini", "daily_used": 12, "daily_cap": 400, "daily_remaining": 388}
  ],
  "circuit_breakers": {"groq": false, "gemini": false, "deepseek": false}
}
```

Shown in dashboard UI as free-tier usage meter.

---

## 9. Gap Summary

| Gap | Priority | Fix |
|-----|----------|-----|
| Persist LLM cache to Neon | HIGH | `llm_cache` table + daily eviction |
| Gemini `cachedContent` for corpus | MEDIUM | 60% token saving on policy calls |
| Cloudflare KV shared token buckets | LOW | Only needed at >1 Render worker |
| Qwen2.5 (DashScope) as 5th SHORT_GEN | LOW | OpenAI-compatible, trivial to add |
| Streaming LLM responses to browser | MEDIUM | Groq/Gemini SSE → `/scans/<id>/stream` |
