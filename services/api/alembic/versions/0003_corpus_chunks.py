"""0003 add corpus_chunks table for RAG pipeline."""
from __future__ import annotations
import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "corpus_chunks",
        sa.Column("chunk_id", sa.String(128), primary_key=True),
        sa.Column("jurisdiction", sa.String(16), nullable=False),
        sa.Column("regulation_version", sa.String(32), nullable=False),
        sa.Column("section", sa.String(512), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("embedding", sa.Text, nullable=True),
        sa.Column("metadata", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_corpus_chunks_jurisdiction", "corpus_chunks", ["jurisdiction"])
    op.create_index("ix_corpus_chunks_regulation", "corpus_chunks", ["regulation_version"])


def downgrade() -> None:
    op.drop_table("corpus_chunks")
