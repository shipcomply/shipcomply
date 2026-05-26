"""NVIDIA NIM provider — OpenAI-compatible endpoint at integrate.api.nvidia.com."""
import httpx
from shipcomply_api.config import settings

_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
_MODEL = "meta/llama-3.3-70b-instruct"


class NvidiaProvider:
    async def chat(self, system: str, user: str, schema=None) -> str:
        if not settings.nvidia_api_key:
            raise RuntimeError("NVIDIA_API_KEY not set")
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                _URL,
                json={
                    "model": _MODEL,
                    "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                    "max_tokens": 2048,
                    "temperature": 0,
                },
                headers={"Authorization": f"Bearer {settings.nvidia_api_key}"},
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
