from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok", "service": "shipcomply-api"}


@router.get("/healthz")
async def liveness():
    """Liveness probe — cheap, no I/O."""
    return {"status": "alive"}


@router.get("/readyz")
async def readiness():
    """Readiness probe — checks DB connectivity."""
    from shipcomply_api.db.session import engine
    try:
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    ready = db_ok
    payload = {"status": "ready" if ready else "not_ready", "checks": {"db": db_ok}}
    code = status.HTTP_200_OK if ready else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(payload, status_code=code)


@router.get("/llm/usage")
async def llm_usage():
    """Live LLM budget: daily requests used/remaining + RPM token state per provider."""
    from shipcomply_api.llm import llm_client
    return llm_client.usage()
