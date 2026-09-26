"""Create ticket_votes table for per-user upvote/downvote functionality.

Revision ID: 0010_add_ticket_votes
Revises: 0009_add_contact_phone_to_institution_applications
Create Date: 2026-09-27
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010_add_ticket_votes"
down_revision: Union[str, None] = "0009_add_contact_phone_to_institution_applications"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ticket_votes",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "ticket_id",
            sa.Integer(),
            sa.ForeignKey("tickets.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("vote", sa.String(4), nullable=False),  # 'up' | 'down'
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("ticket_id", "user_id", name="uq_ticket_vote_user"),
        sa.CheckConstraint("vote IN ('up', 'down')", name="ck_ticket_vote_direction"),
    )


def downgrade() -> None:
    op.drop_table("ticket_votes")
