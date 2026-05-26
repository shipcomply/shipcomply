"""LLM client — routes requests to provider chain based on task type.

Provider order (classification / short gen <=4K ctx):
  Groq -> Cerebras -> NVIDIA -> Zhipu -> Ollama

Provider order (long-context policy gen >8K ctx):
  Gemini 2.5 Flash -> DeepSeek V3 -> Kimi (256K ctx) -> Groq chunked -> Ollama

Guardrails applied on every call:
  1. Cache check (SHA-256, 24h TTL) — skip provider on hit
  2. Per-provider daily cap + RPM token bucket via BudgetGuard
  3. Circuit breaker — 3 consecutive failures disable provider for 5 min
  4. ProviderBudgetExceeded routes to next provider silently
"""
from __future__ import annotations

import logging
import time
from collections import defaultdict
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


class _CircuitBreaker:
    """Disable a provider for RESET_AFTER_S seconds after FAIL_THRESHOLD failures."""

    FAIL_THRESHOLD = 3
    RESET_AFTER_S = 300  # 5 min

    def __init__(self) -> None:
        self._failures: dict[str, int] = defaultdict(int)
        self._open_until: dict[str, float] = {}

    def is_open(self, name: str) -> bool:
        until = self._open_until.get(name, 0)
        if time.monotonic() > until:
            self._failures[name] = 0
            return False
        return True

    def record_failure(self, name: str) -> None:
        self._failures[name] += 1
        if self._failures[name] >= self.FAIL_THRESHOLD:
            self._open_until[name] = time.monotonic() + self.RESET_AFTER_S
            log.warning("Circuit breaker OPEN for provider %s (5 min)", name)

    def record_success(self, name: str) -> None:
        self._failures[name] = 0
        self._open_until.pop(name, None)


class LLMClient:
    def __init__(self) -> None:
        from shipcomply_api.llm.providers.groq import GroqProvider
        from shipcomply_api.llm.providers.gemini import GeminiProvider
        from shipcomply_api.llm.providers.cerebras import CerebrasProvider
        from shipcomply_api.llm.providers.ollama import OllamaProvider
        from shipcomply_api.llm.providers.nvidia import NvidiaProvider
        from shipcomply_api.llm.providers.deepseek import DeepSeekProvider
        from shipcomply_api.llm.providers.zhipu import ZhipuProvider
        from shipcomply_api.llm.providers.kimi import KimiProvider

        self._groq = GroqProvider()
        self._gemini = GeminiProvider()
        self._cerebras = CerebrasProvider()
        self._ollama = OllamaProvider()
        self._nvidia = NvidiaProvider()
        self._deepseek = DeepSeekProvider()
        self._zhipu = ZhipuProvider()
        self._kimi = KimiProvider()

        self._circuit = _CircuitBreaker()

        self._guard = BudgetGuard(
            daily_caps={
                "groq": settings.llm_daily_cap_groq,
                "gemini": settings.llm_daily_cap_gemini,
                "cerebras": settings.llm_daily_cap_cerebras,
                "nvidia": settings.llm_daily_cap_nvidia,
                "deepseek": settings.llm_daily_cap_deepseek,
                "zhipu": settings.llm_daily_cap_zhipu,
                "kimi": settings.llm_daily_cap_kimi,
            },
            rpm_caps={
                "groq": settings.llm_rpm_groq,
                "gemini": settings.llm_rpm_gemini,
                "cerebras": settings.llm_rpm_cerebras,
                "nvidia": settings.llm_rpm_nvidia,
                "deepseek": settings.llm_rpm_deepseek,
                "zhipu": settings.llm_rpm_zhipu,
                "kimi": settings.llm_rpm_kimi,
            },
        )

        self._provider_names = {
            id(self._groq): "groq",
            id(self._gemini): "gemini",
            id(self._cerebras): "cerebras",
            id(self._ollama): "ollama",
            id(self._nvidia): "nvidia",
            id(self._deepseek): "deepseek",
            id(self._zhipu): "zhipu",
            id(self._kimi): "kimi",
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

        if task == TaskType.LONG_GEN:
            providers = [self._gemini, self._deepseek, self._kimi, self._groq, self._ollama]
        else:
            # classification + short_gen
            providers = [self._groq, self._cerebras, self._nvidia, self._zhipu, self._ollama]

        last_error: Exception | None = None
        for provider in providers:
            provider_name = self._provider_names.get(id(provider), "unknown")
            if self._circuit.is_open(provider_name):
                log.debug("Skipping %s — circuit open", provider_name)
                continue
            try:
                await self._guard.acquire(provider_name)
                result = await provider.chat(system, user, schema=schema)
                self._circuit.record_success(provider_name)
                self._guard.cache.set(cache_key, result)
                return result
            except ProviderBudgetExceeded as e:
                log.warning("Budget exceeded for %s: %s", provider_name, e)
                last_error = e
            except Exception as e:
                log.warning("LLM provider %s failed: %s", provider_name, e)
                self._circuit.record_failure(provider_name)
                last_error = e

        raise LLMUnavailable(f"All LLM providers failed. Last error: {last_error}")

    def usage(self) -> dict[str, Any]:
        return {
            "cache_entries": self._guard.cache.size,
            "providers": self._guard.usage_report(),
            "circuit_breakers": {
                name: self._circuit.is_open(name)
                for name in ["groq", "gemini", "cerebras", "nvidia", "deepseek", "zhipu", "kimi"]
            },
        }
