import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.institution import Institution
from app.models.ticket import Ticket
from app.models.rating import Rating

logger = logging.getLogger(__name__)

async def compute_reputation_update(
    institution_id: int, 
    ticket: Ticket, 
    db: AsyncSession,
    is_sla_breach: bool = False
) -> float:
    """
    Computes and updates the reputation score for an institution based on a ticket's outcome.
    
    Weights:
      - 50% Resolution success
      - 30% Citizen rating
      - 20% Turnaround time relative to SLA
    """
    institution = await db.get(Institution, institution_id)
    if not institution:
        logger.error(f"Institution {institution_id} not found for reputation update.")
        return 0.5
        
    # 1. Resolution Component (0.0 to 1.0)
    # If it's an SLA breach escalation, success is 0.
    # Otherwise, assume if this is called it's verified/closed.
    resolution_component = 0.0 if is_sla_breach else 1.0

    # 2. Citizen Rating Component (0.0 to 1.0)
    rating_component = 0.5 # Neutral fallback
    if not is_sla_breach:
        # Fetch rating if any
        query = select(Rating).where(Rating.ticket_id == ticket.id)
        res = await db.execute(query)
        rating = res.scalars().first()
        if rating:
            rating_component = (rating.score - 1.0) / 4.0 # Scale 1-5 to 0-1
    else:
        # SLA breach gets worst rating implicitly
        rating_component = 0.0

    # 3. Turnaround Component (0.0 to 1.0)
    turnaround_component = 0.0
    if not is_sla_breach:
        # Calculate turnaround time
        now = datetime.now(timezone.utc)
        turnaround_time = (now - ticket.created_at.replace(tzinfo=timezone.utc)).total_seconds()
        
        sla_hours = 48.0
        if ticket.sla_deadline:
            sla_hours = (ticket.sla_deadline.replace(tzinfo=timezone.utc) - ticket.created_at.replace(tzinfo=timezone.utc)).total_seconds() / 3600.0
            
        if sla_hours > 0:
            turnaround_hours = turnaround_time / 3600.0
            # If turnaround <= sla_hours, score approaches 1.0
            # If turnaround >= sla_hours, score goes to 0.0
            turnaround_component = max(0.0, min(1.0, 1.0 - (turnaround_hours / sla_hours)))
            
    # Calculate weighted score delta for this ticket
    score_delta = (0.5 * resolution_component) + (0.3 * rating_component) + (0.2 * turnaround_component)
    
    # Apply Exponential Moving Average (EMA)
    # alpha controls how much the new ticket affects the overall score.
    # We'll use 0.2 so recent performance matters but doesn't swing wildly.
    alpha = 0.2
    
    # Global reputation update
    current_global = institution.reputation_score
    new_global = (alpha * score_delta) + ((1.0 - alpha) * current_global)
    institution.reputation_score = new_global
    
    # Domain-specific reputation update
    if ticket.domain:
        # Initialize if not present
        if not institution.reputation_by_domain:
            institution.reputation_by_domain = {}
            
        current_domain = institution.reputation_by_domain.get(ticket.domain, 0.5)
        new_domain = (alpha * score_delta) + ((1.0 - alpha) * current_domain)
        
        # In SQLAlchemy JSONB, we must reassign to trigger the change event
        updated_domains = dict(institution.reputation_by_domain)
        updated_domains[ticket.domain] = new_domain
        institution.reputation_by_domain = updated_domains
        
    db.add(institution)
    return new_global
