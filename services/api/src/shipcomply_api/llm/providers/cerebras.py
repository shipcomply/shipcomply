import httpx
from shipcomply_api.config import settings


class CerebrasProvider:
    """Cerebras — 30 RPM, 1M tokens/day, 8192-token context cap. Short tasks only."""

    _BASE = "https://api.cerebras.ai/v1"

    def __init__(self) -> None:
        self._key = settings.cerebras_api_key

    async def chat(self, system: str, user: str, schema=None) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self._BASE}/chat/completions",
                headers={"Authorization": f"Bearer {self._key}"},
                json={
                    "model": "llama-3.3-70b",
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "temperature": 0,
                    "max_tokens": 2048,
                },
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
