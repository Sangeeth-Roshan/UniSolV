"""
app/ml/clustering/hotspot_detector.py

run_hotspot_detection(db) -> dict

Algorithm
---------
1. Load all tickets created within the last HOTSPOT_LOOKBACK_DAYS that have a
   non-null location and domain, and extract their (lat, lon) coordinates via
   ST_Y / ST_X.
2. Run sklearn DBSCAN with:
      eps   = CLUSTER_RADIUS_METERS / 111_320   (degrees ≈ metres at equator)
      metric = 'euclidean'   (good enough at Jharkhand's latitude ~23°N)
      min_samples = 2
3. For each DBSCAN cluster label (≥ 0, i.e. not noise):
   a. Group by domain; count per-domain members.
   b. If any domain group meets HOTSPOT_MIN_MEMBERS:
      - Upsert an IssueCluster row (or update existing matching cluster).
      - Set is_hotspot = True.
      - Emit a TicketEvent(type=hotspot_detected) on one representative ticket.
      - Stub: call compress_sla(ticket_ids) — no-op until Module 5.
4. Returns a summary dict for logging/testing.

The function is async and designed to be called by the APScheduler job defined
in app/core/scheduler.py.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.enums import EventType
from app.models.issue_cluster import IssueCluster
from app.models.ticket import Ticket
from app.models.ticket_event import TicketEvent

logger = logging.getLogger(__name__)

# Domain-specific thresholds override the global HOTSPOT_MIN_MEMBERS.
# Water contamination is especially dangerous, so lower threshold.
DOMAIN_THRESHOLDS: dict[str, int] = {
    "water management": 3,
    "healthcare": 3,
    "sanitation": 4,
    "environment": 4,
}


# ---------------------------------------------------------------------------
# SLA stub (Module 5 will replace this)
# ---------------------------------------------------------------------------

async def _compress_sla(ticket_ids: list[int], db: AsyncSession) -> None:  # noqa: ARG001
    """
    Stub: compress SLA deadlines for hotspot member tickets.
    Module 5 (escalation service) will implement the real logic.
    Called here to ensure the wiring is in place.
    """
    logger.info(
        "compress_sla: stub called for %d tickets — Module 5 not yet implemented",
        len(ticket_ids),
    )


# ---------------------------------------------------------------------------
# SQL helpers
# ---------------------------------------------------------------------------

_FETCH_TICKETS_SQL = text("""
    SELECT
        t.id,
        t.domain,
        t.cluster_id,
        t.severity_score,
        ST_Y(t.location::geometry) AS lat,
        ST_X(t.location::geometry) AS lon
    FROM tickets t
    WHERE
        t.location IS NOT NULL
        AND t.domain IS NOT NULL
        AND t.created_at >= :cutoff
""")

_UPSERT_CLUSTER_HOTSPOT_SQL = text("""
    UPDATE issue_clusters
    SET is_hotspot = true
    WHERE id = :cluster_id
""")


# ---------------------------------------------------------------------------
# Main function
# ---------------------------------------------------------------------------

async def run_hotspot_detection(db: AsyncSession) -> dict[str, Any]:
    """
    Detect spatial hotspots via DBSCAN and mark qualifying clusters.

    Returns a summary dict with keys:
      - tickets_scanned: int
      - dbscan_clusters_found: int
      - hotspots_marked: int
      - errors: list[str]
    """
    from sklearn.cluster import DBSCAN  # lazy import — heavy dependency

    summary: dict[str, Any] = {
        "tickets_scanned": 0,
        "dbscan_clusters_found": 0,
        "hotspots_marked": 0,
        "errors": [],
        "ran_at": datetime.now(tz=timezone.utc).isoformat(),
    }

    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=settings.HOTSPOT_LOOKBACK_DAYS)

    try:
        result = await db.execute(_FETCH_TICKETS_SQL, {"cutoff": cutoff})
        rows = result.fetchall()
    except Exception as exc:  # noqa: BLE001
        msg = f"run_hotspot_detection: DB fetch failed — {exc}"
        logger.error(msg)
        summary["errors"].append(msg)
        return summary

    if not rows:
        logger.info("run_hotspot_detection: no tickets with location in last %d days",
                    settings.HOTSPOT_LOOKBACK_DAYS)
        return summary

    # Build arrays
    ticket_ids = [r[0] for r in rows]
    domains = [r[1] for r in rows]
    cluster_ids = [r[2] for r in rows]
    severities = [r[3] or 0.5 for r in rows]
    coords = np.array([[r[4], r[5]] for r in rows], dtype=np.float64)

    summary["tickets_scanned"] = len(ticket_ids)

    # DBSCAN — eps in degrees (~metres / 111_320)
    eps_deg = settings.CLUSTER_RADIUS_METERS / 111_320.0
    db_model = DBSCAN(eps=eps_deg, min_samples=2, metric="euclidean")
    labels = db_model.fit_predict(coords)

    unique_labels = set(labels) - {-1}
    summary["dbscan_clusters_found"] = len(unique_labels)
    logger.info("run_hotspot_detection: %d DBSCAN clusters from %d tickets",
                len(unique_labels), len(ticket_ids))

    for label in unique_labels:
        mask = labels == label
        label_ticket_ids = [ticket_ids[i] for i, m in enumerate(mask) if m]
        label_domains = [domains[i] for i, m in enumerate(mask) if m]
        label_cluster_ids = [cluster_ids[i] for i, m in enumerate(mask) if m]
        label_severities = [severities[i] for i, m in enumerate(mask) if m]
        label_coords = coords[mask]

        # Per-domain member counts within this spatial DBSCAN cluster
        domain_counts: dict[str, int] = {}
        for d in label_domains:
            domain_counts[d] = domain_counts.get(d, 0) + 1

        for domain, count in domain_counts.items():
            threshold = DOMAIN_THRESHOLDS.get(domain, settings.HOTSPOT_MIN_MEMBERS)
            if count < threshold:
                continue

            # Find the existing IssueCluster for this spatial group (if any)
            # We match by looking at the existing cluster_ids assigned to members
            existing_cluster_id: int | None = next(
                (cid for cid in label_cluster_ids if cid is not None), None
            )

            centroid_lat = float(label_coords[:, 0].mean())
            centroid_lon = float(label_coords[:, 1].mean())
            avg_severity = float(np.mean(label_severities))

            if existing_cluster_id is not None:
                # Mark existing cluster as hotspot
                await db.execute(
                    _UPSERT_CLUSTER_HOTSPOT_SQL,
                    {"cluster_id": existing_cluster_id},
                )
                cluster_id = existing_cluster_id
                logger.info(
                    "run_hotspot_detection: marked cluster %d as hotspot "
                    "(domain=%s, count=%d)",
                    cluster_id, domain, count,
                )
            else:
                # Create a new cluster record
                new_cluster = IssueCluster(
                    domain=domain,
                    member_count=count,
                    is_hotspot=True,
                    aggregate_severity_score=avg_severity,
                    centroid=f"SRID=4326;POINT({centroid_lon} {centroid_lat})",
                )
                db.add(new_cluster)
                await db.flush()  # get the new id
                cluster_id = new_cluster.id
                logger.info(
                    "run_hotspot_detection: created hotspot cluster %d "
                    "(domain=%s, count=%d, centroid=%.4f,%.4f)",
                    cluster_id, domain, count, centroid_lat, centroid_lon,
                )

            # Emit one hotspot_detected event on the representative ticket
            representative_ticket_id = label_ticket_ids[0]
            event = TicketEvent(
                ticket_id=representative_ticket_id,
                event_type=EventType.hotspot_detected,
                notes=(
                    f"Hotspot detected: {count} {domain!r} reports within "
                    f"{settings.CLUSTER_RADIUS_METERS}m radius in the last "
                    f"{settings.HOTSPOT_LOOKBACK_DAYS} days. "
                    f"cluster_id={cluster_id}"
                ),
            )
            db.add(event)

            # SLA compression stub (Module 5)
            domain_ticket_ids = [
                tid for tid, d in zip(label_ticket_ids, label_domains) if d == domain
            ]
            await _compress_sla(domain_ticket_ids, db)

            summary["hotspots_marked"] += 1

    try:
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        msg = f"run_hotspot_detection: commit failed — {exc}"
        logger.error(msg)
        summary["errors"].append(msg)
        await db.rollback()

    logger.info("run_hotspot_detection complete: %s", summary)
    return summary
