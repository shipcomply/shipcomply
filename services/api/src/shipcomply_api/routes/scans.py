import asyncio
import hashlib
import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from shipcomply_api.auth.deps import CurrentUser, get_current_user
from shipcomply_api.db.session import get_db
from shipcomply_api.db.models import Scan, DataElement as DataElementRow, Finding as FindingRow, Org
from shipcomply_api.middleware.rate_limit import check_anon_ip_rate, check_org_daily_quota
from shipcomply_api.storage.r2 import r2_client

logger = logging.getLogger(__name__)
router = APIRouter()

# Only examples/ is the allowed local scan root — no env override for security
_EXAMPLES_ROOT = Path("examples").resolve()
_BRANCH_RE = re.compile(r"^[A-Za-z0-9_./\-]+$")


def _validate_local_path(raw: str) -> Path:
    try:
        p = Path(raw).resolve(strict=False)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid path")
    # Use is_relative_to (Python 3.9+) — startswith is broken for path containment
    try:
        p.relative_to(_EXAMPLES_ROOT)
    except ValueError:
        raise HTTPException(status_code=403, detail="Path must be within examples/ directory")
    return p


def _resolve_org_id(user: CurrentUser):
    """Return a DB filter for scans belonging to the authenticated user's org."""
    # Used as a coroutine-free helper; org lookup happens in each handler
    return user.org_id  # clerk_org_id — used in join below


async def _get_user_org(user: CurrentUser, db: AsyncSession) -> Org:
    result = await db.execute(select(Org).where(Org.clerk_org_id == user.org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Org not found — complete onboarding first")
    return org


class ScanRequest(BaseModel):
    repo_url: str
    branch: str = "main"
    jurisdiction: str = "DPDP"
    offline: bool = False

    @field_validator("repo_url")
    @classmethod
    def validate_repo_url(cls, v: str) -> str:
        allowed = re.compile(
            r"^https://(github\.com|gitlab\.com|bitbucket\.org)/[A-Za-z0-9_.\-]+/[A-Za-z0-9_.\-]+(\.git)?$"
        )
        if not allowed.match(v.rstrip("/")):
            raise ValueError("repo_url must be a public HTTPS GitHub/GitLab/Bitbucket URL")
        return v

    @field_validator("branch")
    @classmethod
    def validate_branch(cls, v: str) -> str:
        if not _BRANCH_RE.match(v) or v.startswith("-"):
            raise ValueError("branch contains invalid characters")
        return v


class ScanResponse(BaseModel):
    scan_id: str
    status: str
    message: str


async def _run_scan_pipeline(scan_id: str, repo_url: str, branch: str, jurisdiction: str) -> None:
    """Full scan pipeline — delegates to LangGraph agent graph."""
    from shipcomply_api.db.session import AsyncSessionLocal
    from shipcomply_api.agents.graph import run_scan

    async with AsyncSessionLocal() as db:
        async def _set_status(s: str, **extra) -> None:
            await db.execute(update(Scan).where(Scan.id == scan_id).values(status=s, **extra))
            await db.commit()

        try:
            await _set_status("cloning")

            initial: dict = {
                "scan_id": scan_id,
                "repo_url": repo_url,
                "branch": branch,
                "jurisdiction": jurisdiction,
                "offline": False,
                "repo_path": None,
                "commit_sha": None,
                "file_list": [],
                "data_elements": [],
                "files_scanned": 0,
                "kg_dict": None,
                "policy_markdown": None,
                "policy_r2_key": None,
                "code_files": [],
                "guardrail_passed": False,
                "guardrail_violations": [],
                "audit_markdown": None,
                "audit_r2_key": None,
                "compliance_score": 0.0,
                "findings": [],
                "step_log": [],
                "errors": [],
                "final_status": "running",
            }

            final = await run_scan(initial)

            # Persist R2 artifacts
            policy_key = audit_key = kg_key = code_key = None
            uploads = []
            if final.get("policy_markdown"):
                policy_key = f"scans/{scan_id}/policy.md"
                uploads.append(r2_client.put(policy_key, final["policy_markdown"].encode(), "text/markdown"))
            if final.get("audit_markdown"):
                audit_key = f"scans/{scan_id}/audit.md"
                uploads.append(r2_client.put(audit_key, final["audit_markdown"].encode(), "text/markdown"))
            if final.get("kg_dict"):
                kg_key = f"scans/{scan_id}/kg.json"
                uploads.append(r2_client.put(kg_key, json.dumps(final["kg_dict"]).encode(), "application/json"))
            if final.get("code_files"):
                code_key = f"scans/{scan_id}/code.json"
                uploads.append(r2_client.put(code_key, json.dumps(final["code_files"]).encode(), "application/json"))
            if uploads:
                await asyncio.gather(*uploads)

            # Persist DataElement rows
            for el in final.get("data_elements", []):
                db.add(DataElementRow(
                    scan_id=scan_id,
                    element_type=el["element_type"],
                    field_name=el.get("field_name", ""),
                    compliance_flags=el.get("compliance_flags", []),
                    sources=el.get("sources", []),
                ))

            # Persist Finding rows
            for f in final.get("findings", []):
                db.add(FindingRow(
                    scan_id=scan_id,
                    severity=f.get("severity", "INFO"),
                    title=f.get("title", "")[:512],
                    detail=f.get("detail", "") or "",
                    file_path=f.get("file_path"),
                    line_number=f.get("line_number"),
                    regulation=f.get("regulation"),
                ))

            final_status = final.get("final_status", "completed")
            await db.execute(
                update(Scan).where(Scan.id == scan_id).values(
                    status=final_status,
                    commit_sha=final.get("commit_sha"),
                    files_scanned=final.get("files_scanned", 0),
                    compliance_score=final.get("compliance_score", 0),
                    policy_r2_key=policy_key,
                    audit_r2_key=audit_key,
                    kg_r2_key=kg_key,
                    completed_at=datetime.now(timezone.utc),
                )
            )
            await db.commit()

        except Exception as exc:
            logger.error("Scan %s failed: %s", scan_id, exc, exc_info=True)
            try:
                await _set_status("failed")
                await db.execute(update(Scan).where(Scan.id == scan_id).values(error_message=str(exc)[:2000]))
                await db.commit()
            except Exception:
                pass


@router.post("/scans", response_model=ScanResponse)
async def create_scan(
    req: ScanRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_user_org(user, db)
    await check_org_daily_quota(org, db)

    idempotency_key = hashlib.sha256(
        f"{req.repo_url}:{req.branch}:{req.jurisdiction}:{user.org_id}".encode()
    ).hexdigest()
    existing = await db.execute(
        select(Scan).where(Scan.idempotency_key == idempotency_key, Scan.status.notin_(["failed"]))
    )
    if scan := existing.scalar_one_or_none():
        return ScanResponse(scan_id=scan.id, status=scan.status, message="Returning existing in-flight scan")

    scan = Scan(
        org_id=org.id,
        repo_url=req.repo_url,
        branch=req.branch,
        jurisdiction=req.jurisdiction,
        status="queued",
        idempotency_key=idempotency_key,
        started_at=datetime.now(timezone.utc),
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)

    asyncio.create_task(_run_scan_pipeline(scan.id, req.repo_url, req.branch, req.jurisdiction))
    return ScanResponse(scan_id=scan.id, status="queued", message="Scan enqueued")


@router.get("/scans/{scan_id}")
async def get_scan(
    scan_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_user_org(user, db)
    result = await db.execute(select(Scan).where(Scan.id == scan_id, Scan.org_id == org.id))
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
async def stream_scan(
    scan_id: str,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_user_org(user, db)

    async def event_generator():
        from shipcomply_api.db.session import AsyncSessionLocal
        terminal = {"completed", "failed", "completed_with_errors"}
        for _ in range(120):  # 6 min max (120 × 3s)
            if await request.is_disconnected():
                break
            await asyncio.sleep(3)
            async with AsyncSessionLocal() as poll_db:
                result = await poll_db.execute(
                    select(Scan).where(Scan.id == scan_id, Scan.org_id == org.id)
                )
                scan_row = result.scalar_one_or_none()
            if not scan_row:
                yield f"data: {json.dumps({'error': 'scan not found'})}\n\n"
                return
            yield f"data: {json.dumps({'scan_id': scan_id, 'status': scan_row.status})}\n\n"
            if scan_row.status in terminal:
                break
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/scans/{scan_id}/audit")
async def get_scan_audit(
    scan_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_user_org(user, db)
    result = await db.execute(select(Scan).where(Scan.id == scan_id, Scan.org_id == org.id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    if scan.status != "completed":
        return {"scan_id": scan_id, "status": scan.status, "message": "Scan not yet complete"}

    # Try persisted Finding rows first
    findings_result = await db.execute(
        select(FindingRow).where(FindingRow.scan_id == scan_id)
    )
    findings = findings_result.scalars().all()
    if findings:
        return {
            "scan_id": scan_id,
            "status": "completed",
            "score": scan.compliance_score or 0,
            "total_elements": scan.files_scanned,
            "findings": [
                {
                    "severity": f.severity,
                    "title": f.title,
                    "detail": f.detail,
                    "file_path": f.file_path,
                    "line_number": f.line_number,
                }
                for f in findings
            ],
        }

    # Fallback: R2 markdown
    if scan.audit_r2_key:
        try:
            content = await r2_client.get(scan.audit_r2_key)
            return {
                "scan_id": scan_id,
                "status": "completed",
                "score": scan.compliance_score or 0,
                "audit_markdown": content.decode(),
                "findings": [],
            }
        except Exception:
            pass

    return {"scan_id": scan_id, "status": scan.status, "message": "Audit not yet available"}


@router.get("/scans/{scan_id}/policy")
async def get_scan_policy(
    scan_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_user_org(user, db)
    result = await db.execute(select(Scan).where(Scan.id == scan_id, Scan.org_id == org.id))
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


@router.get("/scans/{scan_id}/code")
async def get_scan_code(
    scan_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_user_org(user, db)
    result = await db.execute(select(Scan).where(Scan.id == scan_id, Scan.org_id == org.id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    code_r2_key = getattr(scan, "code_r2_key", None)
    if code_r2_key:
        try:
            content = await r2_client.get(code_r2_key)
            return {"scan_id": scan_id, "status": "completed", "code_files": json.loads(content)}
        except Exception:
            pass
    return {"scan_id": scan_id, "status": scan.status, "message": "Code files not yet available"}


@router.get("/scans/{scan_id}/graph")
async def get_scan_graph(
    scan_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_user_org(user, db)
    result = await db.execute(select(Scan).where(Scan.id == scan_id, Scan.org_id == org.id))
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
async def scan_local(request: Request, body: dict):
    """Local scan restricted to examples/ only — rate-limited by IP."""
    from shipcomply_api.scanner import scan_repo
    from shipcomply_api.scanner.knowledge_graph import build_graph
    await check_anon_ip_rate(request)
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
async def generate_local_policy(request: Request, body: dict):
    """Local policy generation restricted to examples/ — rate-limited by IP."""
    from shipcomply_api.scanner import scan_repo
    from shipcomply_api.legal_writer import PolicyGenerator
    from shipcomply_api.llm import llm_client
    await check_anon_ip_rate(request)
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

