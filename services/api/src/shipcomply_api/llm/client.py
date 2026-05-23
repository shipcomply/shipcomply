"""LLM client — routes requests to provider chain based on task type.

Provider order:
  classification / short gen (<=4K ctx): Groq -> Cerebras -> Ollama
  long-context policy gen (>8K ctx):     Gemini 2.5 Flash -> Groq chunked -> Ollama

Guardrails applied on every call:
  1. Cache check (SHA-256, 24h TTL) — skip provider entirely on hit
  2. Per-provider daily cap + RPM token bucket via BudgetGuard
  3. ProviderBudgetExceeded routes to next provider (not an error)
"""
from __future__ import annotations

import logging
from enum import Enum
from typing import Any

from shipcomply_api.config import settings
from shipcomply_api.llm.guardrails import BudgetGuard, ProviderBudgetExceeded

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

        self._guard = BudgetGuard(
            daily_caps={
                "groq": settings.llm_daily_cap_groq,
                "gemini": settings.llm_daily_cap_gemini,
                "cerebras": settings.llm_daily_cap_cerebras,
            },
            rpm_caps={
                "groq": settings.llm_rpm_groq,
                "gemini": settings.llm_rpm_gemini,
                "cerebras": settings.llm_rpm_cerebras,
            },
        )

        self._provider_names = {
            id(self._groq): "groq",
            id(self._gemini): "gemini",
            id(self._cerebras): "cerebras",
        }

    async def complete(
        self, task: TaskType, system: str, user: str, schema: dict[str, Any] | None = None
    ) -> str:
        if settings.offline:
            return await self._ollama.chat(system, user)

        cache_key = self._guard.cache.key(task, system, user)
        cached = self._guard.cache.get(cache_key)
        if cached is not None:
            return cached

        providers = (
            [self._gemini, self._groq, self._ollama]
            if task == TaskType.LONG_GEN
            else [self._groq, self._cerebras, self._ollama]
        )

        last_error: Exception | None = None
        for provider in providers:
            provider_name = self._provider_names.get(id(provider))
            try:
                await self._guard.acquire(provider_name)
                result = await provider.chat(system, user, schema=schema)
                self._guard.cache.set(cache_key, result)
                return result
            except ProviderBudgetExceeded as e:
                log.warning("Budget exceeded, skipping provider: %s", e)
                last_error = e
            except Exception as e:
                log.warning("LLM provider %s failed: %s", provider.__class__.__name__, e)
                last_error = e

        raise LLMUnavailable(f"All LLM providers failed. Last error: {last_error}")

    def usage(self) -> dict[str, Any]:
        return {
            "cache_entries": self._guard.cache.size,
            "providers": self._guard.usage_report(),
        }
