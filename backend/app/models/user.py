from __future__ import annotations

from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.enums import UserRole


class User(Base):
    """Platform user — covers all roles (citizen, student, admin, etc.)."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        sa.Enum(UserRole, name="user_role"), nullable=False
    )
    institution_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # ── Relationships ────────────────────────────────────────────────────────
    institution: Mapped[Optional["Institution"]] = relationship(
        "Institution", back_populates="users"
    )
    reported_tickets: Mapped[list["Ticket"]] = relationship(
        "Ticket", foreign_keys="Ticket.reporter_id", back_populates="reporter"
    )
    ticket_events: Mapped[list["TicketEvent"]] = relationship(
        "TicketEvent", back_populates="actor"
    )
    ratings: Mapped[list["Rating"]] = relationship("Rating", back_populates="rated_by_user")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<User id={self.id} email={self.email!r} role={self.role}>"
