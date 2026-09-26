from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

import sqlalchemy as sa
from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.enums import ApplicationStatus


class InstitutionApplication(Base):
    """
    A pending registration request from a university/institution.

    Submitted by any user who wants to register their institution on the
    platform. A government officer manually reviews it and either approves
    (creating an Institution record) or rejects it.
    """

    __tablename__ = "institution_applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Who submitted the application
    applicant_id: Mapped[int] = mapped_column(
        Integer,
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    institution_name: Mapped[str] = mapped_column(String(255), nullable=False)
    institution_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # e.g. ["water", "roads", "public-health"]
    domains_of_expertise: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default="[]"
    )
    contact_email: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    status: Mapped[ApplicationStatus] = mapped_column(
        sa.Enum(ApplicationStatus, name="application_status"),
        nullable=False,
        default=ApplicationStatus.pending,
        server_default="pending",
    )
    # Notes from the reviewing officer (rejection reason, etc.)
    review_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # The institution created upon approval — null until approved
    created_institution_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        sa.ForeignKey("institutions.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Relationships ────────────────────────────────────────────────────────
    applicant: Mapped["User"] = relationship(
        "User", foreign_keys=[applicant_id]
    )
    created_institution: Mapped[Optional["Institution"]] = relationship(
        "Institution", foreign_keys=[created_institution_id]
    )

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<InstitutionApplication id={self.id} "
            f"name={self.institution_name!r} status={self.status}>"
        )
