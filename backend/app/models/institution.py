from __future__ import annotations

from datetime import datetime
from typing import Any

import sqlalchemy as sa
from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.enums import InstitutionType


class Institution(Base):
    """
    An entity (university or company) that can accept, work on, and resolve
    civic tickets. Carries a reputation score both globally and per-domain.
    """

    __tablename__ = "institutions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[InstitutionType] = mapped_column(
        sa.Enum(InstitutionType, name="institution_type"), nullable=False
    )
    # List of domain tag strings, e.g. ["water", "roads", "public-health"]
    domains_of_expertise: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default="[]")
    reputation_score: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.5, server_default="0.5"
    )
    # {"water": 0.8, "roads": 0.6, ...}
    reputation_by_domain: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default="{}")
    current_load: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # ── Relationships ────────────────────────────────────────────────────────
    users: Mapped[list["User"]] = relationship("User", back_populates="institution")
    assigned_tickets: Mapped[list["Ticket"]] = relationship(
        "Ticket",
        foreign_keys="Ticket.assigned_institution_id",
        back_populates="assigned_institution",
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Institution id={self.id} name={self.name!r} type={self.type}>"
