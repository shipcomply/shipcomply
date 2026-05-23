from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import asyncio
from shipcomply_api.scanner import scan_repo
from shipcomply_api.scanner.knowledge_graph import build_graph

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


@router.post("/scans/local")
async def scan_local(body: dict):
    """Scan a local path and return the knowledge graph."""
    repo_path = body.get("path", ".")
    result = scan_repo(repo_path)
    graph = build_graph(result)
    return {
        "scan": {
            "total_elements": len(result.data_elements),
            "total_sources": sum(len(e.sources) for e in result.data_elements),
            "files_scanned": result.files_scanned,
        },
        "graph": graph.to_dict(),
    }


@router.get("/scans/{scan_id}/graph")
async def get_scan_graph(scan_id: str):
    """Return the knowledge graph for a completed scan. Stub returns a demo graph."""
    # TODO: fetch from DB once scan persistence is wired
    from shipcomply_api.scanner import ScanResult, DataElement, ElementSource
    demo = ScanResult(
        data_elements=[
            DataElement(
                element_type="email",
                field_name="email",
                compliance_flags=["DPDP_S4", "DPDP_S7", "GDPR_A5_1_A"],
                sources=[ElementSource(file="app/page.tsx", line=12, pattern="jsx_input")],
            )
        ],
        files_scanned=5,
        scan_id=scan_id,
    )
    graph = build_graph(demo)
    return graph.to_dict()
