"""LLM client — routes requests to provider chain based on task type.

Provider order:
  classification / short gen (<=4K ctx): Groq -> Cerebras -> Ollama
  long-context policy gen (>8K ctx):     Gemini 2.5 Flash -> Groq chunked -> Ollama
"""
from __future__ import annotations

import hashlib
import json
import logging
from enum import Enum
from typing import Any

from shipcomply_api.config import settings

log = logging.getLogger(__name__)


class TaskType(str, Enum):
    CLASSIFICATION = "classification"
    SHORT_GEN = "short_gen"
    LONG_GEN = "long_gen"


class LLMUnavailable(Exception):
    pass


class LLMClient:
    def __init__(self) -> None:
        from shipcomply_api.llm.providers.groq import GroqProvider
        from shipcomply_api.llm.providers.gemini import GeminiProvider
        from shipcomply_api.llm.providers.cerebras import CerebrasProvider
        from shipcomply_api.llm.providers.ollama import OllamaProvider

        self._groq = GroqProvider()
        self._gemini = GeminiProvider()
        self._cerebras = CerebrasProvider()
        self._ollama = OllamaProvider()

    def _cache_key(self, task: TaskType, system: str, user: str) -> str:
        payload = json.dumps({"task": task, "system": system, "user": user}, sort_keys=True)
        return hashlib.sha256(payload.encode()).hexdigest()

    async def complete(
        self, task: TaskType, system: str, user: str, schema: dict[str, Any] | None = None
    ) -> str:
        if settings.offline:
            return await self._ollama.chat(system, user)

        providers = (
            [self._gemini, self._groq, self._ollama]
            if task == TaskType.LONG_GEN
            else [self._groq, self._cerebras, self._ollama]
        )

        last_error: Exception | None = None
        for provider in providers:
            try:
                return await provider.chat(system, user, schema=schema)
            except Exception as e:
                log.warning("LLM provider %s failed: %s", provider.__class__.__name__, e)
                last_error = e

        raise LLMUnavailable(f"All LLM providers failed. Last error: {last_error}")
