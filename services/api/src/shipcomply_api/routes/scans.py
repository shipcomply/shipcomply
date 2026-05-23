from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import asyncio

router = APIRouter()


class ScanRequest(BaseModel):
    repo_url: str
    org_id: str
    branch: str = "main"
    offline: bool = False


class ScanResponse(BaseModel):
    scan_id: str
    status: str
    message: str


@router.post("/scans", response_model=ScanResponse)
async def create_scan(req: ScanRequest, background_tasks: BackgroundTasks):
    # TODO: enqueue scan job via pg-boss, return scan_id
    scan_id = "stub-scan-id"
    return ScanResponse(scan_id=scan_id, status="queued", message="Scan enqueued")


@router.get("/scans/{scan_id}")
async def get_scan(scan_id: str):
    # TODO: fetch scan result from DB
    return {"scan_id": scan_id, "status": "pending", "data_elements": []}


@router.get("/scans/{scan_id}/stream")
async def stream_scan(scan_id: str):
    async def event_generator():
        for i in range(3):
            await asyncio.sleep(0.5)
            yield f"data: {json.dumps({'step': i, 'scan_id': scan_id})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
