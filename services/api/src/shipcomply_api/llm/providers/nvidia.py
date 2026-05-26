"""NVIDIA NIM provider — OpenAI-compatible endpoint at api.build.nvidia.com."""
import httpx
from shipcomply_api.config import settings


async def complete(system: str, user: str, max_tokens: int = 2048, model: str = "meta/llama-3.3-70b-instruct") -> tuple[str, int, int]:
    """Returns (text, tokens_in, tokens_out)."""
    if not settings.nvidia_api_key:
        raise RuntimeError("NVIDIA_API_KEY not set")
    url = "https://integrate.api.nvidia.com/v1/chat/completions"
    payload = {
        "model": model,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "max_tokens": max_tokens,
        "temperature": 0,
    }
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(url, json=payload, headers={"Authorization": f"Bearer {settings.nvidia_api_key}"})
        resp.raise_for_status()
        data = resp.json()
    text = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})
    return text, usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)
