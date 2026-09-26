"""Add contact_phone to tickets

Revision ID: e4f1a2b3c4d5
Revises: 7a548e571b25
Create Date: 2026-09-25 15:06:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e4f1a2b3c4d5'
down_revision: Union[str, None] = '7a548e571b25'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tickets', sa.Column('contact_phone', sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column('tickets', 'contact_phone')
