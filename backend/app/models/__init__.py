"""
SQLAlchemy model definitions.

All models are imported here so that Alembic detects them via
``target_metadata = Base.metadata`` in alembic/env.py.

Import order matters for circular-reference avoidance:
  Institution → User → IssueCluster → Ticket → TicketEvent / Attribution / Rating
"""

# Re-export Base for Alembic env.py
from app.core.database import Base  # noqa: F401

# Import every model so SQLAlchemy registers it on Base.metadata
from app.models.institution import Institution  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.issue_cluster import IssueCluster  # noqa: F401
from app.models.ticket import Ticket  # noqa: F401
from app.models.ticket_event import TicketEvent  # noqa: F401
from app.models.attribution import Attribution  # noqa: F401
from app.models.rating import Rating  # noqa: F401
from app.models.institution_application import InstitutionApplication  # noqa: F401

__all__ = [
    "Base",
    "Institution",
    "User",
    "IssueCluster",
    "Ticket",
    "TicketEvent",
    "Attribution",
    "Rating",
    "InstitutionApplication",
]
