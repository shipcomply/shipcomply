import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Text, Integer, Float, Boolean, DateTime, ForeignKey, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from shipcomply_api.db.session import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Org(Base):
    __tablename__ = "orgs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    clerk_org_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    plan: Mapped[str] = mapped_column(String(32), default="free")
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    scans_used_today: Mapped[int] = mapped_column(Integer, default=0)
    scans_reset_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    scans: Mapped[list["Scan"]] = relationship("Scan", back_populates="org")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    clerk_user_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("orgs.id"), index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(32), default="member")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("orgs.id"), index=True)
    repo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    repo_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    commit_sha: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    branch: Mapped[str] = mapped_column(String(255), default="main")
    status: Mapped[str] = mapped_column(String(32), default="queued")
    jurisdiction: Mapped[str] = mapped_column(String(16), default="DPDP")
    compliance_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    files_scanned: Mapped[int] = mapped_column(Integer, default=0)
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(128), unique=True, nullable=True, index=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    policy_r2_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    audit_r2_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pdf_r2_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    kg_r2_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    org: Mapped["Org"] = relationship("Org", back_populates="scans")
    data_elements: Mapped[list["DataElement"]] = relationship("DataElement", back_populates="scan")
    findings: Mapped[list["Finding"]] = relationship("Finding", back_populates="scan")
    agent_runs: Mapped[list["AgentRun"]] = relationship("AgentRun", back_populates="scan")

    __table_args__ = (Index("ix_scans_org_created", "org_id", "created_at"),)


class DataElement(Base):
    __tablename__ = "data_elements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    scan_id: Mapped[str] = mapped_column(String(36), ForeignKey("scans.id"), index=True)
    element_type: Mapped[str] = mapped_column(String(64))
    field_name: Mapped[str] = mapped_column(String(255))
    compliance_flags: Mapped[list] = mapped_column(JSON, default=list)
    sources: Mapped[list] = mapped_column(JSON, default=list)

    scan: Mapped["Scan"] = relationship("Scan", back_populates="data_elements")
    findings: Mapped[list["Finding"]] = relationship("Finding", back_populates="data_element")


class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    scan_id: Mapped[str] = mapped_column(String(36), ForeignKey("scans.id"), index=True)
    data_element_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("data_elements.id"), nullable=True)
    severity: Mapped[str] = mapped_column(String(16))
    title: Mapped[str] = mapped_column(String(512))
    detail: Mapped[str] = mapped_column(Text)
    file_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    line_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    regulation: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    scan: Mapped["Scan"] = relationship("Scan", back_populates="findings")
    data_element: Mapped[Optional["DataElement"]] = relationship("DataElement", back_populates="findings")


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    scan_id: Mapped[str] = mapped_column(String(36), ForeignKey("scans.id"), index=True)
    agent_name: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(32), default="running")
    provider: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    model: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    tokens_in: Mapped[int] = mapped_column(Integer, default=0)
    tokens_out: Mapped[int] = mapped_column(Integer, default=0)
    cache_hit: Mapped[bool] = mapped_column(Boolean, default=False)
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    scan: Mapped["Scan"] = relationship("Scan", back_populates="agent_runs")

    __table_args__ = (Index("ix_agent_runs_scan_agent", "scan_id", "agent_name"),)


class LLMCache(Base):
    __tablename__ = "llm_cache"

    cache_key: Mapped[str] = mapped_column(String(64), primary_key=True)
    provider: Mapped[str] = mapped_column(String(32))
    model: Mapped[str] = mapped_column(String(64))
    response_text: Mapped[str] = mapped_column(Text)
    tokens_in: Mapped[int] = mapped_column(Integer, default=0)
    tokens_out: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    __table_args__ = (Index("ix_llm_cache_expires", "expires_at"),)


class KGNode(Base):
    __tablename__ = "kg_nodes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    node_type: Mapped[str] = mapped_column(String(64), index=True)
    jurisdiction: Mapped[str] = mapped_column(String(16), index=True)
    identifier: Mapped[str] = mapped_column(String(128), index=True)
    title: Mapped[str] = mapped_column(String(512))
    body: Mapped[str] = mapped_column(Text)
    source_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    kg_version: Mapped[str] = mapped_column(String(16), default="1.0.0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    out_edges: Mapped[list["KGEdge"]] = relationship("KGEdge", foreign_keys="KGEdge.from_id", back_populates="from_node")
    in_edges: Mapped[list["KGEdge"]] = relationship("KGEdge", foreign_keys="KGEdge.to_id", back_populates="to_node")

    __table_args__ = (Index("ix_kg_nodes_jurisdiction_type", "jurisdiction", "node_type"),)


class KGEdge(Base):
    __tablename__ = "kg_edges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    from_id: Mapped[str] = mapped_column(String(36), ForeignKey("kg_nodes.id"), index=True)
    to_id: Mapped[str] = mapped_column(String(36), ForeignKey("kg_nodes.id"), index=True)
    relation: Mapped[str] = mapped_column(String(64))
    weight: Mapped[float] = mapped_column(Float, default=1.0)

    from_node: Mapped["KGNode"] = relationship("KGNode", foreign_keys=[from_id], back_populates="out_edges")
    to_node: Mapped["KGNode"] = relationship("KGNode", foreign_keys=[to_id], back_populates="in_edges")

    __table_args__ = (Index("ix_kg_edges_from_relation", "from_id", "relation"),)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    action: Mapped[str] = mapped_column(String(128))
    resource_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    resource_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    request_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    extra_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    __table_args__ = (Index("ix_audit_log_org_created", "org_id", "created_at"),)
