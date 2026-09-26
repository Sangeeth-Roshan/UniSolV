from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

import sqlalchemy as sa
from sqlalchemy import DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.enums import IPOutcome


class Attribution(Base):
    """
    IP / credit governance record for a resolved ticket.
    Tracks who reported it, which institution solved it, whether an industry
    partner was involved, and what IP outcome resulted.
    """

    __tablename__ = "attributions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reporter_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    institution_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    # Optional second institution acting as an industry partner
    industry_partner_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True
    )
    ip_outcome: Mapped[Optional[IPOutcome]] = mapped_column(
        sa.Enum(IPOutcome, name="ip_outcome"), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    worker_credits: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default="[]")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # ── Relationships ────────────────────────────────────────────────────────
    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="attributions")
    reporter: Mapped["User"] = relationship("User", foreign_keys=[reporter_id])
    institution: Mapped["Institution"] = relationship(
        "Institution", foreign_keys=[institution_id]
    )
    industry_partner: Mapped[Optional["Institution"]] = relationship(
        "Institution", foreign_keys=[industry_partner_id]
    )

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<Attribution id={self.id} ticket_id={self.ticket_id}"
            f" ip_outcome={self.ip_outcome}>"
        )
