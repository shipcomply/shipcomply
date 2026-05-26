"""Zhipu GLM-4-Flash — essentially unlimited free tier, ~200ms latency from India."""
import httpx
from shipcomply_api.config import settings

_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"


class ZhipuProvider:
    async def chat(self, system: str, user: str, schema=None) -> str:
        if not settings.zhipu_api_key:
            raise RuntimeError("ZHIPU_API_KEY not set")
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                _URL,
                json={
                    "model": "glm-4-flash",
                    "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                    "max_tokens": 2048,
                    "temperature": 0.01,
                },
                headers={"Authorization": f"Bearer {settings.zhipu_api_key}"},
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
