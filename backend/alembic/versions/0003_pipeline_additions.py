"""
Alembic migration 0003 — Pipeline additions.

Adds:
  - tickets.proof_media_urls  JSONB NOT NULL DEFAULT '[]'
  - tickets.completion_notes  TEXT NULL
  - attributions.worker_credits  JSONB NOT NULL DEFAULT '[]'
  - event_type ENUM: in_progress, completed, verified

Revision ID: 0003_pipeline
Revises:     7a548e571b25
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_pipeline"
down_revision: Union[str, None] = "7a548e571b25"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -- New columns on tickets ------------------------------------------------
    op.add_column(
        "tickets",
        sa.Column(
            "proof_media_urls",
            postgresql.JSONB(),
            nullable=False,
            server_default="[]",
        ),
    )
    op.add_column(
        "tickets",
        sa.Column(
            "completion_notes",
            sa.Text(),
            nullable=True,
        ),
    )

    # -- New column on attributions --------------------------------------------
    op.add_column(
        "attributions",
        sa.Column(
            "worker_credits",
            postgresql.JSONB(),
            nullable=False,
            server_default="[]",
        ),
    )

    # -- Extend the event_type ENUM -------------------------------------------
    # ALTER TYPE ADD VALUE cannot run inside a transaction in PostgreSQL.
    # The async engine runs migrations in autocommit context, so these are safe.
    op.execute("ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'in_progress'")
    op.execute("ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'completed'")
    op.execute("ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'verified'")


def downgrade() -> None:
    # ENUM value removal is not supported in PostgreSQL; we leave the values.
    op.drop_column("attributions", "worker_credits")
    op.drop_column("tickets", "completion_notes")
    op.drop_column("tickets", "proof_media_urls")
