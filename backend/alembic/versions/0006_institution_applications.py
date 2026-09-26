"""Add institution_applications table.

Creates:
  - application_status ENUM type
  - institution_applications table with FK to users and institutions

Revision ID: 0006_institution_applications
Revises: 7a548e571b25
Create Date: 2026-09-25
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# ---------------------------------------------------------------------------
# Revision identifiers
# ---------------------------------------------------------------------------
revision: str = "0006_institution_applications"
down_revision: Union[str, None] = "0003_pipeline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ---------------------------------------------------------------------------
# upgrade
# ---------------------------------------------------------------------------
def upgrade() -> None:
    # 1. Create the application_status ENUM
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)

    # 2. Create the institution_applications table
    op.create_table(
        "institution_applications",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "applicant_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("institution_name", sa.String(255), nullable=False),
        sa.Column("institution_type", sa.String(50), nullable=False),
        sa.Column(
            "domains_of_expertise",
            postgresql.JSONB(),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("contact_email", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Text(),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.Column(
            "created_institution_id",
            sa.Integer(),
            sa.ForeignKey("institutions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Cast status column to the enum type
    op.execute("ALTER TABLE institution_applications ALTER COLUMN status DROP DEFAULT")
    op.execute(
        "ALTER TABLE institution_applications "
        "ALTER COLUMN status TYPE application_status "
        "USING status::application_status"
    )
    op.execute(
        "ALTER TABLE institution_applications "
        "ALTER COLUMN status SET DEFAULT 'pending'::application_status"
    )

    op.create_index(
        "ix_institution_applications_applicant_id",
        "institution_applications",
        ["applicant_id"],
    )
    op.create_index(
        "ix_institution_applications_status",
        "institution_applications",
        ["status"],
    )


# ---------------------------------------------------------------------------
# downgrade
# ---------------------------------------------------------------------------
def downgrade() -> None:
    op.drop_index("ix_institution_applications_status", table_name="institution_applications")
    op.drop_index("ix_institution_applications_applicant_id", table_name="institution_applications")
    op.drop_table("institution_applications")
    op.execute("DROP TYPE IF EXISTS application_status")
