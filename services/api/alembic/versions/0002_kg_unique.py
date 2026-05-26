"""0002 add unique constraint on kg_nodes(jurisdiction, identifier)."""
from __future__ import annotations
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_kg_nodes_jurisdiction_identifier",
        "kg_nodes",
        ["jurisdiction", "identifier"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_kg_nodes_jurisdiction_identifier", "kg_nodes")