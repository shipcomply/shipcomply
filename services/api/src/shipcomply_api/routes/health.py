from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok", "service": "shipcomply-api"}


@router.get("/llm/usage")
async def llm_usage():
    """Live LLM budget: daily requests used/remaining + RPM token state per provider."""
    from shipcomply_api.llm import llm_client
    return llm_client.usage()
