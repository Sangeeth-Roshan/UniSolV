"""Add contact_phone to institution_applications table.

Revision ID: 0009_add_contact_phone_to_institution_applications
Revises: 0008_add_phone_to_users
Create Date: 2026-09-26
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009_add_contact_phone_to_institution_applications"
down_revision: Union[str, None] = "0008_add_phone_to_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "institution_applications",
        sa.Column("contact_phone", sa.String(50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("institution_applications", "contact_phone")
