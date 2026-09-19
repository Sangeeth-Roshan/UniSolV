"""
app/services/clustering/ticket_cluster_service.py

process_new_ticket(ticket, embedding, db) -> Ticket

Wires find_duplicates into the ticket-creation flow:

  1. Call find_duplicates — returns an existing cluster_id or None.

  MERGE path (cluster_id returned):
     - Set ticket.cluster_id = cluster_id.
     - Increment issue_clusters.member_count by 1.
     - Update aggregate_severity_score (running weighted average).
     - Optionally update representative_embedding (keep the newest).
     - Emit a TicketEvent(type=cluster_merged).

  NEW CLUSTER path (None returned):
     - Create a new IssueCluster with:
           domain   = ticket.domain
           centroid = ticket.location   (copied directly)
           member_count = 1
           aggregate_severity_score = ticket.severity_score
           representative_embedding = embedding (as JSON list)
     - Set ticket.cluster_id = new cluster.id.

Both paths flush to the DB (the caller is responsible for the final commit,
since this service is designed to be composed inside a larger transaction).
"""

from __future__ import annotations

import json
import logging
from typing import Optional

import numpy as np
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ml.clustering.duplicate_detector import find_duplicates
from app.models.enums import EventType
from app.models.issue_cluster import IssueCluster
from app.models.ticket import Ticket
from app.models.ticket_event import TicketEvent

logger = logging.getLogger(__name__)


def _embedding_to_json(embedding: np.ndarray) -> list[float]:
    """Convert a numpy array to a plain Python list for JSONB storage."""
    return embedding.astype(float).tolist()


def _update_running_avg(
    current_avg: float, current_count: int, new_value: float
) -> float:
    """Incremental mean: avg_new = (avg_old * n + new_value) / (n + 1)"""
    return (current_avg * current_count + new_value) / (current_count + 1)


async def process_new_ticket(
    ticket: Ticket,
    embedding: np.ndarray,
    db: AsyncSession,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
) -> Ticket:
    """
    Determine whether a newly created ticket belongs to an existing cluster or
    should seed a new one, then update the DB accordingly.

    Args:
        ticket:    A ``Ticket`` instance that has been added to the session but
                   not yet committed.  Must have ``domain`` and ``severity_score``
                   set (post-classification).
        embedding: The 1-D sentence-transformer embedding for this ticket's
                   ``title + description``.
        db:        The active ``AsyncSession`` (commit is the caller's responsibility).
        lat:       Latitude override (extracted from ticket.location by the caller
                   if needed; skip PostGIS call if None).
        lon:       Longitude override.

    Returns:
        The (possibly mutated) ``ticket`` with ``cluster_id`` set.
    """
    cluster_id: Optional[int] = None

    # Only run spatial duplicate detection when coordinates are available
    if lat is not None and lon is not None:
        cluster_id = await find_duplicates(embedding, lat, lon, db)

    if cluster_id is not None:
        # ── MERGE PATH ────────────────────────────────────────────────────────
        result = await db.execute(
            select(IssueCluster).where(IssueCluster.id == cluster_id).with_for_update()
        )
        cluster = result.scalar_one_or_none()

        if cluster is None:
            logger.warning(
                "process_new_ticket: cluster %d disappeared between find and select — "
                "falling through to new-cluster creation",
                cluster_id,
            )
            cluster_id = None  # fall through to new-cluster path below
        else:
            old_count = cluster.member_count
            cluster.member_count = old_count + 1
            cluster.aggregate_severity_score = _update_running_avg(
                cluster.aggregate_severity_score,
                old_count,
                ticket.severity_score or 0.5,
            )
            # Update representative embedding to the newest ticket
            cluster.representative_embedding = _embedding_to_json(embedding)

            ticket.cluster_id = cluster.id
            db.add(cluster)

            # Audit event
            event = TicketEvent(
                ticket_id=ticket.id,
                event_type=EventType.cluster_merged,
                notes=(
                    f"Ticket merged into existing cluster {cluster.id} "
                    f"(domain={cluster.domain!r}, "
                    f"member_count now {cluster.member_count})."
                ),
            )
            db.add(event)
            await db.flush()

            logger.info(
                "process_new_ticket: ticket %s merged into cluster %d "
                "(member_count=%d, agg_severity=%.3f)",
                ticket.id, cluster.id, cluster.member_count,
                cluster.aggregate_severity_score,
            )
            return ticket

    # ── NEW CLUSTER PATH ──────────────────────────────────────────────────────
    if cluster_id is None:
        centroid_wkt: Optional[str] = None
        if lat is not None and lon is not None:
            centroid_wkt = f"SRID=4326;POINT({lon} {lat})"

        new_cluster = IssueCluster(
            domain=ticket.domain or "unknown",
            member_count=1,
            is_hotspot=False,
            aggregate_severity_score=ticket.severity_score or 0.5,
            representative_embedding=_embedding_to_json(embedding),
            centroid=centroid_wkt,
        )
        db.add(new_cluster)
        await db.flush()  # populate new_cluster.id

        ticket.cluster_id = new_cluster.id
        db.add(ticket)

        logger.info(
            "process_new_ticket: created new cluster %d for ticket %s "
            "(domain=%r, centroid=%s)",
            new_cluster.id, ticket.id, new_cluster.domain, centroid_wkt,
        )

    return ticket
