"""Zhipu GLM provider — GLM-4.7-Flash is fully free with no cap."""
import httpx
from shipcomply_api.config import settings


async def complete(system: str, user: str, max_tokens: int = 2048, model: str = "glm-4-flash") -> tuple[str, int, int]:
    if not settings.zhipu_api_key:
        raise RuntimeError("ZHIPU_API_KEY not set")
    url = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
    payload = {
        "model": model,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "max_tokens": max_tokens,
        "temperature": 0.01,
    }
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(url, json=payload, headers={"Authorization": f"Bearer {settings.zhipu_api_key}"})
        resp.raise_for_status()
        data = resp.json()
    text = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})
    return text, usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)
