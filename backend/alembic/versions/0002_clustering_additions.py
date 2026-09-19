"""
Alembic migration 0002 — Clustering additions.

Adds:
  - issue_clusters.aggregate_severity_score  FLOAT NOT NULL DEFAULT 0
  - issue_clusters.representative_embedding  JSONB NULL
  - event_type ENUM: hotspot_detected, cluster_merged

Revision ID: 0002
Revises:     0001
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -- New columns on issue_clusters ----------------------------------------
    op.add_column(
        "issue_clusters",
        sa.Column(
            "aggregate_severity_score",
            sa.Float(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "issue_clusters",
        sa.Column(
            "representative_embedding",
            postgresql.JSONB(),
            nullable=True,
        ),
    )

    # -- Extend the event_type ENUM (cannot be done inside a transaction in PG) -
    # ALTER TYPE ... ADD VALUE is idempotent when wrapped in a DO block.
    # We must commit before altering an enum used by an existing table, so we
    # execute these outside the implicit transaction via op.execute + COMMIT trick.
    op.execute("COMMIT")   # end the implicit transaction started by Alembic
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'hotspot_detected';
        EXCEPTION WHEN others THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'cluster_merged';
        EXCEPTION WHEN others THEN NULL;
        END $$;
    """)
    op.execute("BEGIN")    # restart a transaction for Alembic to commit cleanly


def downgrade() -> None:
    # ENUM value removal is not supported in PostgreSQL; we leave the values.
    op.drop_column("issue_clusters", "representative_embedding")
    op.drop_column("issue_clusters", "aggregate_severity_score")
