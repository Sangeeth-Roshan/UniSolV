"""Add phone column to users table

Revision ID: 0008_add_phone_to_users
Revises: 0007_merge_heads
Create Date: 2026-09-26
"""
from alembic import op
import sqlalchemy as sa

revision = '0008_add_phone_to_users'
down_revision = '0007_merge_heads'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('phone', sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'phone')
