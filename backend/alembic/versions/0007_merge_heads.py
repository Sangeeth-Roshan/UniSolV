"""
Merge migration 0007 — merges both divergent heads into one linear chain.

Heads being merged:
  - e4f1a2b3c4d5  (contact_phone column)
  - 0006_institution_applications  (institution_applications table)

Revision ID: 0007_merge_heads
Revises:     e4f1a2b3c4d5, 0006_institution_applications
"""
from typing import Sequence, Union

revision: str = "0007_merge_heads"
down_revision: Union[str, tuple[str, ...]] = ("e4f1a2b3c4d5", "0006_institution_applications")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Nothing to do — both branches have already applied their DDL changes.
    pass


def downgrade() -> None:
    pass
