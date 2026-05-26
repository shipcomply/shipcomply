"""0001 initial schema — Org, User, Scan, DataElement, Finding, AgentRun, LLMCache, KGNode, KGEdge, AuditLog."""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table(
        "orgs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("clerk_org_id", sa.String(64), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(64), nullable=False, unique=True),
        sa.Column("plan", sa.String(32), nullable=False, server_default="free"),
        sa.Column("stripe_customer_id", sa.String(64), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(64), nullable=True),
        sa.Column("scans_used_today", sa.Integer, nullable=False, server_default="0"),
        sa.Column("scans_reset_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_orgs_clerk_org_id", "orgs", ["clerk_org_id"])
    op.create_index("ix_orgs_slug", "orgs", ["slug"])

    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("clerk_user_id", sa.String(64), nullable=False, unique=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("orgs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("role", sa.String(32), nullable=False, server_default="member"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_clerk_user_id", "users", ["clerk_user_id"])

    op.create_table(
        "scans",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("orgs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("repo_url", sa.Text, nullable=False),
        sa.Column("repo_path", sa.Text, nullable=True),
        sa.Column("branch", sa.String(255), nullable=False, server_default="main"),
        sa.Column("commit_sha", sa.String(40), nullable=True),
        sa.Column("jurisdiction", sa.String(32), nullable=False, server_default="DPDP"),
        sa.Column("status", sa.String(32), nullable=False, server_default="queued"),
        sa.Column("idempotency_key", sa.String(64), nullable=False, unique=True),
        sa.Column("files_scanned", sa.Integer, nullable=True),
        sa.Column("compliance_score", sa.Float, nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("policy_r2_key", sa.Text, nullable=True),
        sa.Column("audit_r2_key", sa.Text, nullable=True),
        sa.Column("kg_r2_key", sa.Text, nullable=True),
        sa.Column("started_at", sa.DateTime, nullable=True),
        sa.Column("completed_at", sa.DateTime, nullable=True),
    )
    op.create_index("ix_scans_org_id", "scans", ["org_id"])
    op.create_index("ix_scans_idempotency_key", "scans", ["idempotency_key"])

    op.create_table(
        "data_elements",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("scan_id", sa.String(36), sa.ForeignKey("scans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("element_type", sa.String(64), nullable=False),
        sa.Column("field_name", sa.String(255), nullable=False),
        sa.Column("compliance_flags", sa.JSON, nullable=True),
        sa.Column("sources", sa.JSON, nullable=True),
    )
    op.create_index("ix_data_elements_scan_id", "data_elements", ["scan_id"])

    op.create_table(
        "findings",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("scan_id", sa.String(36), sa.ForeignKey("scans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("severity", sa.String(16), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("detail", sa.Text, nullable=True),
        sa.Column("file_path", sa.Text, nullable=True),
        sa.Column("line_number", sa.Integer, nullable=True),
        sa.Column("regulation", sa.String(32), nullable=True),
        sa.Column("section", sa.String(64), nullable=True),
        sa.Column("remediation", sa.Text, nullable=True),
    )
    op.create_index("ix_findings_scan_id", "findings", ["scan_id"])

    op.create_table(
        "agent_runs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("scan_id", sa.String(36), sa.ForeignKey("scans.id", ondelete="CASCADE"), nullable=True),
        sa.Column("agent_name", sa.String(64), nullable=False),
        sa.Column("provider", sa.String(32), nullable=True),
        sa.Column("model", sa.String(64), nullable=True),
        sa.Column("tokens_in", sa.Integer, nullable=True),
        sa.Column("tokens_out", sa.Integer, nullable=True),
        sa.Column("cache_hit", sa.Boolean, nullable=True),
        sa.Column("latency_ms", sa.Integer, nullable=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="ok"),
        sa.Column("error", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_agent_runs_scan_id", "agent_runs", ["scan_id"])

    op.create_table(
        "llm_cache",
        sa.Column("cache_key", sa.String(64), primary_key=True),
        sa.Column("response", sa.Text, nullable=False),
        sa.Column("provider", sa.String(32), nullable=True),
        sa.Column("model", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "kg_nodes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("node_type", sa.String(64), nullable=False),
        sa.Column("jurisdiction", sa.String(32), nullable=False, server_default="DPDP"),
        sa.Column("identifier", sa.String(64), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text, nullable=True),
        sa.Column("source_url", sa.Text, nullable=True),
        sa.Column("kg_version", sa.String(16), nullable=False, server_default="1.0.0"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_kg_nodes_jurisdiction_type", "kg_nodes", ["jurisdiction", "node_type"])
    op.create_index("ix_kg_nodes_identifier", "kg_nodes", ["identifier"])

    op.create_table(
        "kg_edges",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("from_id", sa.String(36), sa.ForeignKey("kg_nodes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("to_id", sa.String(36), sa.ForeignKey("kg_nodes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("relation", sa.String(64), nullable=False),
        sa.Column("weight", sa.Float, nullable=False, server_default="1.0"),
    )
    op.create_index("ix_kg_edges_from_id", "kg_edges", ["from_id", "relation"])

    op.create_table(
        "audit_log",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), nullable=True),
        sa.Column("user_id", sa.String(36), nullable=True),
        sa.Column("action", sa.String(64), nullable=False),
        sa.Column("resource_type", sa.String(64), nullable=True),
        sa.Column("resource_id", sa.String(64), nullable=True),
        sa.Column("metadata", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_audit_log_org_id", "audit_log", ["org_id"])


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("kg_edges")
    op.drop_table("kg_nodes")
    op.drop_table("llm_cache")
    op.drop_table("agent_runs")
    op.drop_table("findings")
    op.drop_table("data_elements")
    op.drop_table("scans")
    op.drop_table("users")
    op.drop_table("orgs")
