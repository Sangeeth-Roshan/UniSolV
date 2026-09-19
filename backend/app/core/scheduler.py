"""
app/core/scheduler.py

APScheduler (AsyncIOScheduler) integration for UniSOLV background jobs.

Jobs registered here:
  - hotspot_detection  — runs run_hotspot_detection every HOTSPOT_JOB_INTERVAL_HOURS

Usage (in main.py lifespan):
    from app.core.scheduler import setup_scheduler
    setup_scheduler(app)

The scheduler creates its own DB session per run so it is completely decoupled
from the per-request session pool.
"""

from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import FastAPI

from app.core.config import settings

logger = logging.getLogger(__name__)

_scheduler = AsyncIOScheduler()


async def _hotspot_job() -> None:
    """Scheduled job wrapper — creates its own DB session."""
    from app.core.database import AsyncSessionLocal
    from app.ml.clustering.hotspot_detector import run_hotspot_detection

    logger.info("scheduler: starting hotspot detection job")
    async with AsyncSessionLocal() as db:
        try:
            summary = await run_hotspot_detection(db)
            logger.info("scheduler: hotspot detection done — %s", summary)
        except Exception as exc:  # noqa: BLE001
            logger.error("scheduler: hotspot detection job failed — %s", exc)


async def _sla_breach_job() -> None:
    """Scheduled job to check for SLA breaches."""
    from app.core.database import AsyncSessionLocal
    from app.services.routing.escalation_engine import check_sla_breaches

    logger.info("scheduler: starting SLA breach check job")
    async with AsyncSessionLocal() as db:
        try:
            summary = await check_sla_breaches(db)
            logger.info("scheduler: SLA breach check done — %s", summary)
        except Exception as exc:  # noqa: BLE001
            logger.error("scheduler: SLA breach check failed — %s", exc)


def setup_scheduler(app: FastAPI) -> None:  # noqa: ARG001
    """
    Register all background jobs and configure the scheduler.

    Call this once during application startup (inside the lifespan context).
    """
    interval_hours = settings.HOTSPOT_JOB_INTERVAL_HOURS

    _scheduler.add_job(
        _hotspot_job,
        trigger=IntervalTrigger(hours=interval_hours),
        id="hotspot_detection",
        name="DBSCAN hotspot detection",
        replace_existing=True,
        max_instances=1,        # prevent overlap if a run takes longer than interval
        coalesce=True,          # skip missed executions on restart
    )

    _scheduler.add_job(
        _sla_breach_job,
        trigger=IntervalTrigger(hours=1),
        id="sla_breach_check",
        name="Check SLA breaches",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    logger.info(
        "scheduler: registered hotspot_detection job (every %dh)",
        interval_hours,
    )
    logger.info("scheduler: registered sla_breach_check job (every 1h)")


def start_scheduler() -> None:
    """Start the APScheduler event loop (called from lifespan startup)."""
    if not _scheduler.running:
        _scheduler.start()
        logger.info("scheduler: started")


def stop_scheduler() -> None:
    """Gracefully shut down the scheduler (called from lifespan shutdown)."""
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("scheduler: stopped")


# Expose the scheduler instance for testing / job inspection
scheduler = _scheduler
