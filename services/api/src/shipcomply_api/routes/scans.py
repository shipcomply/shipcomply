from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
import json
import asyncio
import os
from pathlib import Path

router = APIRouter()

# Paths allowed for local scanning — must be under one of these roots
_SCAN_ROOTS = [
    Path(os.environ.get("SCAN_ROOT", "/tmp/shipcomply-scans")).resolve(),
    Path("examples").resolve(),
]

def _validate_local_path(raw: str) -> Path:
    """Reject path traversal: resolved path must be under an allowed root."""
    try:
        p = Path(raw).resolve(strict=False)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid path")
    allowed = any(
        str(p).startswith(str(root)) for root in _SCAN_ROOTS
    )
    if not allowed:
        raise HTTPException(
            status_code=403,
            detail=f"Path not in allowed scan roots. Set SCAN_ROOT env var or use examples/.",
        )
    return p


class ScanRequest(BaseModel):
    repo_url: str
    org_id: str
    branch: str = "main"
    offline: bool = False

    @field_validator("repo_url")
    @classmethod
    def validate_repo_url(cls, v: str) -> str:
        import re
        allowed = re.compile(
            r'^https://(github\.com|gitlab\.com|bitbucket\.org)/[A-Za-z0-9_.\-]+/[A-Za-z0-9_.\-]+(\.git)?$'
        )
        if not allowed.match(v.rstrip("/")):
            raise ValueError("repo_url must be a public HTTPS GitHub/GitLab/Bitbucket URL")
        return v


class ScanResponse(BaseModel):
    scan_id: str
    status: str
    message: str


@router.post("/scans", response_model=ScanResponse)
async def create_scan(req: ScanRequest, background_tasks: BackgroundTasks):
    scan_id = "stub-scan-id"
    return ScanResponse(scan_id=scan_id, status="queued", message="Scan enqueued")


@router.get("/scans/{scan_id}")
async def get_scan(scan_id: str):
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
    from shipcomply_api.scanner import scan_repo
    from shipcomply_api.scanner.knowledge_graph import build_graph
    safe_path = _validate_local_path(body.get("path", "examples/sample-nextjs-app"))
    result = scan_repo(str(safe_path))
    graph = build_graph(result)
    return {
        "scan": {
            "scan_id": result.scan_id,
            "total_elements": len(result.data_elements),
            "total_sources": sum(len(e.sources) for e in result.data_elements),
            "files_scanned": result.files_scanned,
        },
        "graph": graph.to_dict(),
    }


@router.post("/scans/local/policy")
async def generate_local_policy(body: dict):
    from shipcomply_api.scanner import scan_repo
    from shipcomply_api.legal_writer import PolicyGenerator
    safe_path = _validate_local_path(body.get("path", "examples/sample-nextjs-app"))
    jurisdiction = body.get("jurisdiction", "DPDP")
    result = scan_repo(str(safe_path))
    policy = PolicyGenerator().generate(result, jurisdiction=jurisdiction)
    return {
        "scan_id": policy.scan_id,
        "jurisdiction": policy.jurisdiction,
        "generated_at": policy.generated_at,
        "sections_count": len(policy.sections),
        "total_citations": sum(len(s.citations) for s in policy.sections),
        "markdown": policy.to_markdown(),
        "sections": policy.to_dict()["sections"],
    }


def _demo_scan(scan_id: str):
    from shipcomply_api.scanner import ScanResult, DataElement, ElementSource
    return ScanResult(
        repo_path="demo",
        scan_id=scan_id,
        data_elements=[
            DataElement(element_type="email", field_name="email",
                        compliance_flags=["DPDP_S4", "DPDP_S7", "GDPR_A5_1_A"],
                        sources=[ElementSource(file="app/page.tsx", line=12, pattern="jsx_input")]),
            DataElement(element_type="phone", field_name="phone",
                        compliance_flags=["DPDP_S4", "GDPR_A5_1_A"],
                        sources=[ElementSource(file="app/page.tsx", line=15, pattern="jsx_input")]),
            DataElement(element_type="name", field_name="firstName",
                        compliance_flags=["DPDP_S4", "GDPR_A5_1_A"],
                        sources=[ElementSource(file="app/page.tsx", line=9, pattern="jsx_input")]),
        ],
        files_scanned=5,
    )


@router.get("/scans/{scan_id}/graph")
async def get_scan_graph(scan_id: str):
    from shipcomply_api.scanner.knowledge_graph import build_graph
    return build_graph(_demo_scan(scan_id)).to_dict()


@router.get("/scans/{scan_id}/policy")
async def get_scan_policy(scan_id: str, jurisdiction: str = "DPDP"):
    from shipcomply_api.legal_writer import PolicyGenerator
    policy = PolicyGenerator().generate(_demo_scan(scan_id), jurisdiction=jurisdiction)
    return policy.to_dict()


@router.get("/scans/{scan_id}/audit")
async def get_scan_audit(scan_id: str):
    from shipcomply_api.audit import AuditAgent
    report = AuditAgent().audit(_demo_scan(scan_id))
    return report.to_dict()
