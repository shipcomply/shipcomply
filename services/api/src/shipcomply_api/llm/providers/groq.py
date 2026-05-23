from groq import AsyncGroq
from shipcomply_api.config import settings


class GroqProvider:
    def __init__(self) -> None:
        self._client = AsyncGroq(api_key=settings.groq_api_key)

    async def chat(self, system: str, user: str, schema=None) -> str:
        response = await self._client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0,
            max_tokens=4096,
        )
        return response.choices[0].message.content or ""
