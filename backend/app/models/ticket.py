from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

import sqlalchemy as sa
from geoalchemy2 import Geography
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.enums import TicketStatus


class Ticket(Base):
    """
    Core civic-issue report. Location is stored as PostGIS GEOGRAPHY(Point, 4326)
    with a GIST spatial index (created in the Alembic migration).
    """

    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    reporter_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    # List of URLs to photos/videos: ["https://..."]
    media_urls: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default="[]")
    # PostGIS GEOGRAPHY(Point, 4326)
    location: Mapped[Optional[Any]] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )
    domain: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    severity_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    classification_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[TicketStatus] = mapped_column(
        sa.Enum(TicketStatus, name="ticket_status"),
        nullable=False,
        default=TicketStatus.pending_validation,
        server_default="pending_validation",
        index=True,
    )
    cluster_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("issue_clusters.id", ondelete="SET NULL"), nullable=True, index=True
    )
    assigned_institution_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("institutions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    sla_deadline: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    public_good_consent: Mapped[bool] = mapped_column(
        sa.Boolean, nullable=False, default=False, server_default="false"
    )
    public_good_consent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # ── Relationships ────────────────────────────────────────────────────────
    reporter: Mapped["User"] = relationship(
        "User", foreign_keys=[reporter_id], back_populates="reported_tickets"
    )
    cluster: Mapped[Optional["IssueCluster"]] = relationship(
        "IssueCluster", back_populates="tickets"
    )
    assigned_institution: Mapped[Optional["Institution"]] = relationship(
        "Institution",
        foreign_keys=[assigned_institution_id],
        back_populates="assigned_tickets",
    )
    events: Mapped[list["TicketEvent"]] = relationship(
        "TicketEvent", back_populates="ticket", order_by="TicketEvent.created_at"
    )
    attributions: Mapped[list["Attribution"]] = relationship(
        "Attribution", back_populates="ticket"
    )
    ratings: Mapped[list["Rating"]] = relationship("Rating", back_populates="ticket")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Ticket id={self.id} status={self.status} domain={self.domain!r}>"
