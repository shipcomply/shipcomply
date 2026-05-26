"""Moonshot Kimi — 256K context window, best for large repos that exceed Groq/Gemini limits."""
import httpx
from shipcomply_api.config import settings

_URL = "https://api.moonshot.cn/v1/chat/completions"


class KimiProvider:
    async def chat(self, system: str, user: str, schema=None) -> str:
        if not settings.kimi_api_key:
            raise RuntimeError("KIMI_API_KEY not set")
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                _URL,
                json={
                    "model": "moonshot-v1-8k",
                    "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                    "max_tokens": 4096,
                    "temperature": 0,
                },
                headers={"Authorization": f"Bearer {settings.kimi_api_key}"},
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
