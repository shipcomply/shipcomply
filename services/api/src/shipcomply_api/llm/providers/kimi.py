"""Moonshot Kimi provider — 256K context window, useful for large legal corpus reads."""
import httpx
from shipcomply_api.config import settings


async def complete(system: str, user: str, max_tokens: int = 4096, model: str = "moonshot-v1-8k") -> tuple[str, int, int]:
    if not settings.kimi_api_key:
        raise RuntimeError("KIMI_API_KEY not set")
    url = "https://api.moonshot.cn/v1/chat/completions"
    payload = {
        "model": model,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "max_tokens": max_tokens,
        "temperature": 0,
    }
    async with httpx.AsyncClient(timeout=90) as client:
        resp = await client.post(url, json=payload, headers={"Authorization": f"Bearer {settings.kimi_api_key}"})
        resp.raise_for_status()
        data = resp.json()
    text = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})
    return text, usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)
