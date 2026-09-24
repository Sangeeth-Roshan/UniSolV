"""
app/ml/clustering/duplicate_detector.py

find_duplicates(new_embedding, lat, lon, db) -> Optional[int]

Algorithm
---------
1. ST_DWithin PostGIS query retrieves all IssueCluster rows whose centroid
   lies within CLUSTER_RADIUS_METERS of (lat, lon).
2. For each nearby cluster that has a stored representative_embedding, compute
   cosine similarity against new_embedding.
3. Return the cluster_id of the best match whose similarity exceeds
   CLUSTER_SIMILARITY_THRESHOLD.  Return None if no match.

The function is async and accepts an AsyncSession so it integrates naturally
with the FastAPI request lifecycle.  It also works in test mode (pass a mock
session).
"""

from __future__ import annotations

import json
import logging
from typing import Optional

import numpy as np
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

logger = logging.getLogger(__name__)

# Pre-compiled SQL — uses PostGIS ST_DWithin on GEOGRAPHY columns (metres)
_NEARBY_CLUSTERS_SQL = text("""
    SELECT
        ic.id,
        ic.domain,
        ic.member_count,
        ic.aggregate_severity_score,
        ic.representative_embedding
    FROM issue_clusters ic
    WHERE
        ic.centroid IS NOT NULL
        AND ic.representative_embedding IS NOT NULL
        AND ST_DWithin(
            ic.centroid,
            ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
            :radius_m
        )
    ORDER BY ic.member_count DESC
""")


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = (np.linalg.norm(a) + 1e-10) * (np.linalg.norm(b) + 1e-10)
    return float(np.dot(a, b) / denom)


async def find_duplicates(
    new_embedding: np.ndarray,
    lat: float,
    lon: float,
    db: AsyncSession,
    radius_m: int | None = None,
    similarity_threshold: float | None = None,
) -> Optional[int]:
    """
    Check whether a new ticket belongs to an existing nearby cluster.

    Args:
        new_embedding: 1-D numpy float array (sentence-transformer embedding).
        lat: Latitude of the new ticket (WGS-84).
        lon: Longitude of the new ticket (WGS-84).
        db: Active SQLAlchemy AsyncSession.
        radius_m: Search radius in metres (defaults to settings value).
        similarity_threshold: Cosine-sim cutoff (defaults to settings value).

    Returns:
        The ``cluster_id`` of the best matching cluster, or ``None`` if the
        ticket should form a new cluster.
    """
    radius_m = radius_m if radius_m is not None else settings.CLUSTER_RADIUS_METERS
    threshold = (
        similarity_threshold
        if similarity_threshold is not None
        else settings.CLUSTER_SIMILARITY_THRESHOLD
    )

    try:
        result = await db.execute(
            _NEARBY_CLUSTERS_SQL,
            {"lat": lat, "lon": lon, "radius_m": radius_m},
        )
        rows = result.fetchall()
    except Exception as exc:  # noqa: BLE001
        logger.error("find_duplicates: DB query failed — %s", exc)
        return None

    if not rows:
        logger.debug("find_duplicates: no nearby clusters within %dm", radius_m)
        return None

    best_cluster_id: Optional[int] = None
    best_sim = -1.0

    for row in rows:
        cluster_id, domain, member_count, _, rep_emb_raw = row

        # representative_embedding is stored as a JSONB list of floats
        if rep_emb_raw is None:
            continue
        try:
            if isinstance(rep_emb_raw, str):
                rep_vec = np.array(json.loads(rep_emb_raw), dtype=np.float32)
            else:
                rep_vec = np.array(rep_emb_raw, dtype=np.float32)
        except (ValueError, TypeError) as exc:
            logger.warning("find_duplicates: bad embedding for cluster %d — %s", cluster_id, exc)
            continue

        sim = _cosine_similarity(new_embedding.astype(np.float32), rep_vec)
        logger.debug("find_duplicates: cluster %d similarity=%.3f", cluster_id, sim)

        if sim > best_sim:
            best_sim = sim
            best_cluster_id = cluster_id

    if best_sim >= threshold:
        logger.info(
            "find_duplicates: merging into cluster %d (sim=%.3f >= threshold=%.3f)",
            best_cluster_id, best_sim, threshold,
        )
        return best_cluster_id

    logger.info(
        "find_duplicates: best similarity %.3f below threshold %.3f — new cluster candidate",
        best_sim, threshold,
    )
    return None
