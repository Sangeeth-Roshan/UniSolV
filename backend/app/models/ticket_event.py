from __future__ import annotations

from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy import DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.enums import EventType


class TicketEvent(Base):
    """
    Immutable audit trail entry for a ticket.
    Every status transition, routing decision, or actor action appends a row here.
    """

    __tablename__ = "ticket_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[EventType] = mapped_column(
        sa.Enum(EventType, name="event_type"), nullable=False
    )
    actor_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )

    # ── Relationships ────────────────────────────────────────────────────────
    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="events")
    actor: Mapped[Optional["User"]] = relationship("User", back_populates="ticket_events")

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<TicketEvent id={self.id} ticket_id={self.ticket_id}"
            f" type={self.event_type} actor={self.actor_id}>"
        )
