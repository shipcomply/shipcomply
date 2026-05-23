import httpx
from shipcomply_api.config import settings


class OllamaProvider:
    """Ollama — local inference, no network required."""

    def __init__(self) -> None:
        self._base = settings.ollama_base_url
        self._model = settings.ollama_model

    async def chat(self, system: str, user: str, schema=None) -> str:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{self._base}/api/chat",
                json={
                    "model": self._model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "stream": False,
                    "options": {"temperature": 0},
                },
            )
            resp.raise_for_status()
            return resp.json()["message"]["content"]
