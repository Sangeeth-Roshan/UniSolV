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
        ticket.routing_shortlist = []
        return ticket

    top_choice = shortlist.pop(0)
    ticket.routing_shortlist = shortlist
    ticket.assigned_institution_id = top_choice
    ticket.status = TicketStatus.routed
    
    # MOD-3: Increment load on dispatch
    inst = await db.get(Institution, top_choice)
    if inst:
        inst.current_load = (inst.current_load or 0) + 1

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
    db.add(ticket)  # MIN-2: explicitly track ticket
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
    # Using FOR UPDATE for CRIT-3 is required, but let's just do FOR UPDATE here.
    # The instructions say: "CRIT-3: Add row-level locking to prevent the accept/escalate race. Use SELECT ... FOR UPDATE on the ticket row in both the /accept endpoint and check_sla_breaches()"
    # So we should add with_for_update() to the query!
    query = query.with_for_update()
    
    result = await db.execute(query)
    tickets = result.scalars().all()

    summary = {"escalated": 0, "notified": 0}

    for ticket in tickets:
        if ticket.status == TicketStatus.routed:
            # Escalation
            failed_inst_id = ticket.assigned_institution_id
            
            # Penalize failed institution
            if failed_inst_id:
                failed_inst = await db.get(Institution, failed_inst_id)
                if failed_inst and (failed_inst.current_load or 0) > 0:
                    failed_inst.current_load -= 1
                from app.services.reputation.reputation_engine import compute_reputation_update
                await compute_reputation_update(failed_inst_id, ticket, db, is_sla_breach=True)

            shortlist = list(ticket.routing_shortlist) if ticket.routing_shortlist else []

            if shortlist:
                next_choice = shortlist.pop(0)
                ticket.assigned_institution_id = next_choice
                new_inst = await db.get(Institution, next_choice)
                if new_inst:
                    new_inst.current_load = (new_inst.current_load or 0) + 1
                ticket.routing_shortlist = shortlist
                ticket.sla_deadline = now + timedelta(hours=24) # New SLA for escalated
                # Per CRIT-5 follow-up: set status back to 'routed' so new inst can accept
                ticket.status = TicketStatus.routed

                event = TicketEvent(
                    ticket_id=ticket.id,
                    event_type=EventType.escalated,
                    notes=f"SLA breached by {failed_inst_id}. Escalated to {next_choice}."
                )
                db.add(event)
                summary["escalated"] += 1
            else:
                logger.warning(f"Ticket {ticket.id} escalated but no more institutions available.")
                ticket.status = TicketStatus.escalated  # Terminal state
                
        elif ticket.status == TicketStatus.in_progress:
            # Notify officer for manual intervention
            logger.info(f"Ticket {ticket.id} breached SLA while in_progress. Notifying officer.")
            summary["notified"] += 1

    await db.commit()
    return summary
