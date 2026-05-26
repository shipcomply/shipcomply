"""DeepSeek V3 — automatic prefix caching (hit = 1/10th price), 128K ctx."""
import httpx
from shipcomply_api.config import settings

_URL = "https://api.deepseek.com/v1/chat/completions"


class DeepSeekProvider:
    async def chat(self, system: str, user: str, schema=None) -> str:
        if not settings.deepseek_api_key:
            raise RuntimeError("DEEPSEEK_API_KEY not set")
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                _URL,
                json={
                    "model": "deepseek-chat",
                    "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                    "max_tokens": 4096,
                    "temperature": 0,
                },
                headers={"Authorization": f"Bearer {settings.deepseek_api_key}"},
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
