"""
app/services/routing/escalation_engine.py

Routing and escalation engine.
1. rank_institutions(ticket) -> List[int]
2. dispatch_ticket(ticket)
3. check_sla_breaches() -> dict
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.enums import EventType, TicketStatus
from app.models.institution import Institution
from app.models.ticket import Ticket
from app.models.ticket_event import TicketEvent
from app.models.issue_cluster import IssueCluster

logger = logging.getLogger(__name__)

async def rank_institutions(
    ticket: Ticket, 
    db: AsyncSession, 
    exclude_ids: Optional[List[int]] = None
) -> List[int]:
    """
    Rank institutions for a given ticket.
    Returns the top 5 institution IDs.
    """
    if exclude_ids is None:
        exclude_ids = []

    query = select(Institution).where(Institution.id.notin_(exclude_ids) if exclude_ids else True)
    result = await db.execute(query)
    institutions = result.scalars().all()

    ranked = []
    for inst in institutions:
        # Domain match
        domains = inst.domains_of_expertise if inst.domains_of_expertise else []
        domain_match = 1.0 if ticket.domain and ticket.domain in domains else 0.0

        # Reputation by domain fallback
        rep_dict = inst.reputation_by_domain if inst.reputation_by_domain else {}
        rep = rep_dict.get(ticket.domain, inst.reputation_score) if ticket.domain else inst.reputation_score

        # Inverse of current load
        load_inverse = 1.0 / (inst.current_load + 1)

        # Ranking score = weighted sum
        score = (domain_match * 2.0) + (rep * 1.0) + (load_inverse * 1.0)
        ranked.append((score, inst.id))

    # Sort descending based on score
    ranked.sort(key=lambda x: x[0], reverse=True)
    return [inst_id for score, inst_id in ranked[:5]]


async def dispatch_ticket(ticket: Ticket, db: AsyncSession) -> Ticket:
    """
    Route a validated ticket to the best institution.
    """
    shortlist = await rank_institutions(ticket, db)

    if not shortlist:
        logger.warning(f"No available institutions to route ticket {ticket.id}")
        return ticket

    top_choice = shortlist[0]
    ticket.assigned_institution_id = top_choice
    ticket.status = TicketStatus.routed

    # Set SLA deadline based on severity and hotspot
    base_hours = 48.0
    severity = ticket.severity_score or 0.5
    # Higher severity = shorter SLA
    sla_hours = base_hours * (1.0 - (severity * 0.5))

    if ticket.cluster_id:
        cluster = await db.get(IssueCluster, ticket.cluster_id)
        if cluster and cluster.is_hotspot:
            # Compress further if it belongs to a hotspot
            sla_hours *= 0.5

    ticket.sla_deadline = datetime.now(timezone.utc) + timedelta(hours=sla_hours)

    event = TicketEvent(
        ticket_id=ticket.id,
        event_type=EventType.routed,
        notes=f"Routed to institution {top_choice} with SLA {sla_hours:.1f}h"
    )
    db.add(event)
    return ticket


async def check_sla_breaches(db: AsyncSession) -> dict:
    """
    Scheduled job that checks for SLA breaches in 'routed' and 'in_progress' tickets.
    """
    now = datetime.now(timezone.utc)
    query = select(Ticket).where(
        Ticket.sla_deadline < now,
        Ticket.status.in_([TicketStatus.routed, TicketStatus.in_progress])
    )
    result = await db.execute(query)
    tickets = result.scalars().all()

    summary = {"escalated": 0, "notified": 0}

    for ticket in tickets:
        if ticket.status == TicketStatus.routed:
            # Escalation
            failed_inst_id = ticket.assigned_institution_id
            
            # Penalize failed institution
            if failed_inst_id:
                from app.services.reputation.reputation_engine import compute_reputation_update
                await compute_reputation_update(failed_inst_id, ticket, db, is_sla_breach=True)

            # Find previously routed institutions for this ticket to exclude them
            event_query = select(TicketEvent).where(
                TicketEvent.ticket_id == ticket.id,
                TicketEvent.event_type == EventType.routed
            )
            events_res = await db.execute(event_query)
            
            import re
            exclude_ids = []
            if failed_inst_id:
                exclude_ids.append(failed_inst_id)
            for ev in events_res.scalars():
                match = re.search(r"Routed to institution (\d+)", ev.notes or "")
                if match:
                    exclude_ids.append(int(match.group(1)))

            shortlist = await rank_institutions(ticket, db, exclude_ids=exclude_ids)

            if shortlist:
                next_choice = shortlist[0]
                ticket.assigned_institution_id = next_choice
                ticket.sla_deadline = now + timedelta(hours=24) # New SLA for escalated

                event = TicketEvent(
                    ticket_id=ticket.id,
                    event_type=EventType.escalated,
                    notes=f"SLA breached by {failed_inst_id}. Escalated to {next_choice}."
                )
                db.add(event)
                summary["escalated"] += 1
            else:
                logger.warning(f"Ticket {ticket.id} escalated but no more institutions available.")
                
        elif ticket.status == TicketStatus.in_progress:
            # Notify officer for manual intervention
            logger.info(f"Ticket {ticket.id} breached SLA while in_progress. Notifying officer.")
            summary["notified"] += 1

    await db.commit()
    return summary
