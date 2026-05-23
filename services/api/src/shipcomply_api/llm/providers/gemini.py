from google import genai
from google.genai import types
from shipcomply_api.config import settings


class GeminiProvider:
    """Gemini 2.5 Flash — 10 RPM, 500 RPD, 1M context. Long-context policy gen."""

    def __init__(self) -> None:
        self._client = genai.Client(api_key=settings.gemini_api_key)

    async def chat(self, system: str, user: str, schema=None) -> str:
        response = await self._client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=[{"role": "user", "parts": [{"text": user}]}],
            config=types.GenerateContentConfig(
                system_instruction=system,
                temperature=0,
                max_output_tokens=8192,
            ),
        )
        return response.text or ""
