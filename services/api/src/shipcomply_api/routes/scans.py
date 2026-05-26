import asyncio
import hashlib
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from shipcomply_api.auth.deps import CurrentUser, get_current_user
from shipcomply_api.db.session import get_db
from shipcomply_api.db.models import Scan, DataElement as DataElementRow, Finding as FindingRow, Org
from shipcomply_api.middleware.rate_limit import check_org_daily_quota
from shipcomply_api.storage.r2 import r2_client

logger = logging.getLogger(__name__)
router = APIRouter()

_SCAN_ROOTS = [
    Path(os.environ.get("SCAN_ROOT", "/tmp/shipcomply-scans")).resolve(),
    Path("examples").resolve(),
]


def _validate_local_path(raw: str) -> Path:
    try:
        p = Path(raw).resolve(strict=False)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid path")
    if not any(str(p).startswith(str(root)) for root in _SCAN_ROOTS):
        raise HTTPException(status_code=403, detail="Path not in allowed scan roots")
    return p


class ScanRequest(BaseModel):
    repo_url: str
    branch: str = "main"
    jurisdiction: str = "DPDP"
    offline: bool = False

    @field_validator("repo_url")
    @classmethod
    def validate_repo_url(cls, v: str) -> str:
        import re
        allowed = re.compile(r"^https://(github\.com|gitlab\.com|bitbucket\.org)/[A-Za-z0-9_.\-]+/[A-Za-z0-9_.\-]+(\.git)?$")
        if not allowed.match(v.rstrip("/")):
            raise ValueError("repo_url must be a public HTTPS GitHub/GitLab/Bitbucket URL")
        return v


class ScanResponse(BaseModel):
    scan_id: str
    status: str
    message: str


async def _run_scan_pipeline(scan_id: str, repo_url: str, branch: str, jurisdiction: str, db_url: str) -> None:
    """Full scan pipeline executed as background task."""
    from shipcomply_api.db.session import AsyncSessionLocal
    from shipcomply_api.scanner import scan_repo
    from shipcomply_api.scanner.knowledge_graph import build_graph
    from shipcomply_api.legal_writer import PolicyGenerator
    from shipcomply_api.audit import AuditAgent
    from shipcomply_api.llm import llm_client

    async with AsyncSessionLocal() as db:
        async def _update_status(s: str) -> None:
            await db.execute(update(Scan).where(Scan.id == scan_id).values(status=s))
            await db.commit()

        try:
            await _update_status("cloning")
            import tempfile, subprocess  # noqa: E401
            with tempfile.TemporaryDirectory(prefix="shipcomply-") as tmp:
                result = subprocess.run(
                    ["git", "clone", "--depth=1", "--branch", branch, repo_url, tmp],
                    capture_output=True, text=True, timeout=120,
                )
                if result.returncode != 0:
                    raise RuntimeError(f"git clone failed: {result.stderr[:500]}")

                await _update_status("scanning")
                scan_result = scan_repo(tmp)
                commit_sha = subprocess.run(
                    ["git", "-C", tmp, "rev-parse", "HEAD"],
                    capture_output=True, text=True
                ).stdout.strip()

                await _update_status("building_kg")
                graph = build_graph(scan_result)

                await _update_status("writing_policy")
                policy = PolicyGenerator(llm_client=llm_client).generate(scan_result, jurisdiction=jurisdiction)

                await _update_status("auditing")
                audit_report = AuditAgent().audit(scan_result)

                policy_key = f"scans/{scan_id}/policy.md"
                audit_key = f"scans/{scan_id}/audit.md"
                kg_key = f"scans/{scan_id}/kg.json"

                await asyncio.gather(
                    r2_client.put(policy_key, policy.to_markdown().encode(), "text/markdown"),
                    r2_client.put(audit_key, audit_report.to_markdown().encode(), "text/markdown"),
                    r2_client.put(kg_key, json.dumps(graph.to_dict()).encode(), "application/json"),
                )

                for el in scan_result.data_elements:
                    db.add(DataElementRow(
                        scan_id=scan_id,
                        element_type=el.element_type,
                        field_name=el.field_name,
                        compliance_flags=el.compliance_flags,
                        sources=[{"file": s.file, "line": s.line, "pattern": s.pattern} for s in el.sources],
                    ))

                await db.execute(
                    update(Scan).where(Scan.id == scan_id).values(
                        status="completed",
                        commit_sha=commit_sha,
                        files_scanned=scan_result.files_scanned,
                        compliance_score=audit_report.score,
                        policy_r2_key=policy_key,
                        audit_r2_key=audit_key,
                        kg_r2_key=kg_key,
                        completed_at=datetime.utcnow(),
                    )
                )
                await db.commit()

        except Exception as exc:
            logger.error("Scan %s failed: %s", scan_id, exc, exc_info=True)
            await _update_status("failed")
            await db.execute(update(Scan).where(Scan.id == scan_id).values(error_message=str(exc)[:2000]))
            await db.commit()


@router.post("/scans", response_model=ScanResponse)
async def create_scan(
    req: ScanRequest,
    background_tasks: BackgroundTasks,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org_result = await db.execute(select(Org).where(Org.clerk_org_id == user.org_id))
    org = org_result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Org not found — complete onboarding first")

    await check_org_daily_quota(org.id, org.plan)

    idempotency_key = hashlib.sha256(f"{req.repo_url}:{req.branch}:{req.jurisdiction}:{user.org_id}".encode()).hexdigest()
    existing = await db.execute(select(Scan).where(Scan.idempotency_key == idempotency_key, Scan.status.notin_(["failed"])))
    if scan := existing.scalar_one_or_none():
        return ScanResponse(scan_id=scan.id, status=scan.status, message="Returning existing in-flight scan")

    from shipcomply_api.config import settings
    scan = Scan(
        org_id=org.id,
        repo_url=req.repo_url,
        branch=req.branch,
        jurisdiction=req.jurisdiction,
        status="queued",
        idempotency_key=idempotency_key,
        started_at=datetime.utcnow(),
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)

    background_tasks.add_task(_run_scan_pipeline, scan.id, req.repo_url, req.branch, req.jurisdiction, settings.database_url)
    return ScanResponse(scan_id=scan.id, status="queued", message="Scan enqueued")


@router.get("/scans/{scan_id}")
async def get_scan(
    scan_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return {
        "scan_id": scan.id,
        "status": scan.status,
        "repo_url": scan.repo_url,
        "jurisdiction": scan.jurisdiction,
        "compliance_score": scan.compliance_score,
        "files_scanned": scan.files_scanned,
        "started_at": scan.started_at.isoformat() if scan.started_at else None,
        "completed_at": scan.completed_at.isoformat() if scan.completed_at else None,
        "error_message": scan.error_message,
    }


@router.get("/scans/{scan_id}/stream")
async def stream_scan(scan_id: str, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    async def event_generator():
        terminal = {"completed", "failed"}
        for _ in range(60):
            await asyncio.sleep(3)
            result = await db.execute(select(Scan).where(Scan.id == scan_id))
            scan = result.scalar_one_or_none()
            if not scan:
                yield f"data: {json.dumps({'error': 'scan not found'})}\n\n"
                return
            payload = {"scan_id": scan_id, "status": scan.status}
            yield f"data: {json.dumps(payload)}\n\n"
            if scan.status in terminal:
                break
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/scans/{scan_id}/audit")
async def get_scan_audit(
    scan_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    if scan.status != "completed":
        return {"scan_id": scan_id, "status": scan.status, "message": "Scan not yet complete"}
    if scan.audit_r2_key:
        try:
            content = await r2_client.get(scan.audit_r2_key)
            return {"scan_id": scan_id, "status": "completed", "audit_markdown": content.decode()}
        except Exception:
            pass
    from shipcomply_api.audit import AuditAgent
    from shipcomply_api.scanner import ScanResult, DataElement as ScanDE, ElementSource
    elements_result = await db.execute(select(DataElementRow).where(DataElementRow.scan_id == scan_id))
    elements = elements_result.scalars().all()
    scan_result = ScanResult(
        repo_path=scan.repo_path or scan.repo_url or "",
        scan_id=scan.id,
        data_elements=[
            ScanDE(
                element_type=el.element_type,
                field_name=el.field_name,
                compliance_flags=el.compliance_flags,
                sources=[ElementSource(**s) for s in (el.sources or [])],
            )
            for el in elements
        ],
        files_scanned=scan.files_scanned,
    )
    report = AuditAgent().audit(scan_result)
    return report.to_dict()


@router.get("/scans/{scan_id}/policy")
async def get_scan_policy(
    scan_id: str,
    jurisdiction: str = "DPDP",
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    if scan.policy_r2_key:
        try:
            content = await r2_client.get(scan.policy_r2_key)
            return {"scan_id": scan_id, "status": "completed", "policy_markdown": content.decode()}
        except Exception:
            pass
    return {"scan_id": scan_id, "status": scan.status, "message": "Policy not yet available"}


@router.get("/scans/{scan_id}/graph")
async def get_scan_graph(
    scan_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    if scan.kg_r2_key:
        try:
            content = await r2_client.get(scan.kg_r2_key)
            return json.loads(content)
        except Exception:
            pass
    return {"scan_id": scan_id, "status": scan.status, "message": "Knowledge graph not yet available"}


@router.post("/scans/local")
async def scan_local(body: dict):
    """Public local-path scan endpoint (demo / smoke-test — no auth required)."""
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
    """Public local-path policy generation (demo — no auth required)."""
    from shipcomply_api.scanner import scan_repo
    from shipcomply_api.legal_writer import PolicyGenerator
    from shipcomply_api.llm import llm_client
    safe_path = _validate_local_path(body.get("path", "examples/sample-nextjs-app"))
    jurisdiction = body.get("jurisdiction", "DPDP")
    result = scan_repo(str(safe_path))
    policy = PolicyGenerator(llm_client=llm_client).generate(result, jurisdiction=jurisdiction)
    return {
        "scan_id": policy.scan_id,
        "jurisdiction": policy.jurisdiction,
        "generated_at": policy.generated_at,
        "sections_count": len(policy.sections),
        "total_citations": sum(len(s.citations) for s in policy.sections),
        "markdown": policy.to_markdown(),
        "sections": policy.to_dict()["sections"],
    }
