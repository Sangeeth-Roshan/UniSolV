from __future__ import annotations

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class TicketVote(Base):
    """
    One vote (upvote or downvote) per user per ticket.
    A UNIQUE constraint enforces the one-vote-per-user-per-ticket rule at the DB level.
    """

    __tablename__ = "ticket_votes"
    __table_args__ = (
        UniqueConstraint("ticket_id", "user_id", name="uq_ticket_vote_user"),
        sa.CheckConstraint("vote IN ('up', 'down')", name="ck_ticket_vote_direction"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    vote: Mapped[str] = mapped_column(String(4), nullable=False)  # 'up' | 'down'
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # ── Relationships ────────────────────────────────────────────────────────
    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="votes")
    user: Mapped["User"] = relationship("User", back_populates="ticket_votes")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<TicketVote ticket={self.ticket_id} user={self.user_id} vote={self.vote!r}>"
