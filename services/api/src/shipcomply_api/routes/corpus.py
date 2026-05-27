from fastapi import APIRouter
from sqlalchemy import text
from shipcomply_api.db.session import AsyncSessionLocal

router = APIRouter()


@router.get("/corpus/status")
async def corpus_status():
    async with AsyncSessionLocal() as db:
        try:
            count_result = await db.execute(text("SELECT COUNT(*) FROM corpus_chunks"))
            count = int(count_result.scalar() or 0)
            juris_result = await db.execute(
                text("SELECT DISTINCT jurisdiction FROM corpus_chunks ORDER BY jurisdiction")
            )
            jurisdictions = [row[0] for row in juris_result.fetchall()]
        except Exception:
            count = 0
            jurisdictions = []
    return {"count": count, "jurisdictions": jurisdictions, "loaded": count > 0}
