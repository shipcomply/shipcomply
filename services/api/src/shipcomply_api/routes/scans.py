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
    """Scan a local path and return element counts + knowledge graph."""
    from shipcomply_api.scanner import scan_repo
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


@router.post("/scans/local/policy")
async def generate_local_policy(body: dict):
    """Scan a local path and generate a privacy policy."""
    from shipcomply_api.legal_writer import PolicyGenerator
    repo_path = body.get("path", ".")
    jurisdiction = body.get("jurisdiction", "DPDP")
    result = scan_repo(repo_path)
    generator = PolicyGenerator()
    policy = generator.generate(result, jurisdiction=jurisdiction)
    return {
        "scan_id": policy.scan_id,
        "jurisdiction": policy.jurisdiction,
        "generated_at": policy.generated_at,
        "sections_count": len(policy.sections),
        "total_citations": sum(len(s.citations) for s in policy.sections),
        "markdown": policy.to_markdown(),
        "sections": policy.to_dict()["sections"],
    }


@router.get("/scans/{scan_id}/graph")
async def get_scan_graph(scan_id: str):
    """Return knowledge graph for a scan (stub with demo data)."""
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


@router.get("/scans/{scan_id}/policy")
async def get_scan_policy(scan_id: str, jurisdiction: str = "DPDP"):
    """Return generated privacy policy for a scan (stub with demo data)."""
    from shipcomply_api.scanner import ScanResult, DataElement, ElementSource
    from shipcomply_api.legal_writer import PolicyGenerator
    demo = ScanResult(
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
        scan_id=scan_id,
    )
    generator = PolicyGenerator()
    policy = generator.generate(demo, jurisdiction=jurisdiction)
    return policy.to_dict()


@router.get("/scans/{scan_id}/audit")
async def get_scan_audit(scan_id: str):
    """Return compliance audit for a scan (stub with demo data)."""
    from shipcomply_api.scanner import ScanResult, DataElement, ElementSource
    from shipcomply_api.audit import AuditAgent
    demo = ScanResult(
        data_elements=[
            DataElement(element_type="email", field_name="email",
                        compliance_flags=["DPDP_S4", "GDPR_A5_1_A"],
                        sources=[ElementSource(file="app/page.tsx", line=12, pattern="jsx_input")]),
            DataElement(element_type="phone", field_name="phone",
                        compliance_flags=["DPDP_S4"],
                        sources=[ElementSource(file="app/page.tsx", line=15, pattern="jsx_input")]),
        ],
        files_scanned=5,
        scan_id=scan_id,
    )
    agent = AuditAgent()
    report = agent.audit(demo)
    return report.to_dict()
