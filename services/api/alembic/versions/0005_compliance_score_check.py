"""0005 add CHECK constraint compliance_score 0-100."""
from __future__ import annotations
import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_scans_compliance_score_range",
        "scans",
        sa.text("compliance_score IS NULL OR (compliance_score >= 0 AND compliance_score <= 100)"),
    )


def downgrade() -> None:
    op.drop_constraint("ck_scans_compliance_score_range", "scans", type_="check")
