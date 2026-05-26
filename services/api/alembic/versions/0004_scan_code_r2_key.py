"""0004 add code_r2_key column to scans table."""
from __future__ import annotations
import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("scans", sa.Column("code_r2_key", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("scans", "code_r2_key")
