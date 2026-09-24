from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from geoalchemy2 import Geography
from sqlalchemy import Boolean, DateTime, Float, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class IssueCluster(Base):
    """
    A spatial + semantic cluster of related tickets.
    The centroid is a PostGIS GEOGRAPHY(Point, 4326) column;
    a GIST index is added in the Alembic migration.
    """

    __tablename__ = "issue_clusters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # PostGIS GEOGRAPHY(Point, 4326) — WGS-84 lat/lon
    centroid: Mapped[Optional[Any]] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )
    domain: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    member_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    is_hotspot: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    # Running weighted average of member ticket severity scores
    aggregate_severity_score: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0, server_default="0"
    )
    # JSON-serialised float list (384-dim MiniLM vector) of the representative ticket
    representative_embedding: Mapped[Optional[Any]] = mapped_column(
        JSONB, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # ── Relationships ────────────────────────────────────────────────────────
    tickets: Mapped[list["Ticket"]] = relationship("Ticket", back_populates="cluster")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<IssueCluster id={self.id} domain={self.domain!r} hotspot={self.is_hotspot}>"
