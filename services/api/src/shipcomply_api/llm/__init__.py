from shipcomply_api.llm.client import LLMClient, LLMUnavailable, TaskType

# Module-level singleton — all routes share one instance (and one BudgetGuard)
llm_client = LLMClient()

__all__ = ["llm_client", "LLMClient", "LLMUnavailable", "TaskType"]
