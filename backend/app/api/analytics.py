from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, text
from typing import Any, List, Dict
from datetime import datetime, timedelta, timezone
from geoalchemy2 import Geometry

from app.api.dependencies import get_db, require_role, get_current_user
from app.models.user import User, UserRole
from app.models.ticket import Ticket
from app.models.ticket_event import TicketEvent
from app.models.institution import Institution
from app.models.issue_cluster import IssueCluster
from app.models.enums import TicketStatus, EventType

router = APIRouter()

@router.get("/domains", summary="Domain distribution")
async def get_domain_distribution(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.government_officer]))
):
    """Get the distribution of tickets by domain."""
    query = select(Ticket.domain, func.count(Ticket.id).label("count")).group_by(Ticket.domain)
    result = await db.execute(query)
    
    data = []
    for domain, count in result.all():
        if domain:
            data.append({"name": domain, "value": count})
    
    return sorted(data, key=lambda x: x["value"], reverse=True)

@router.get("/funnel", summary="Ticket status funnel")
async def get_ticket_funnel(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.government_officer]))
):
    """Get counts of tickets at various funnel stages."""
    # We want a count of tickets currently in these statuses. 
    # Or total counts that passed through. For a simple funnel, current status works for the demo.
    query = select(Ticket.status, func.count(Ticket.id)).group_by(Ticket.status)
    result = await db.execute(query)
    
    status_counts = dict(result.all())
    
    # Simple funnel: submitted -> routed -> accepted -> closed
    # Note: A ticket in 'closed' has passed through all previous stages.
    # To build a true funnel, we accumulate reverse, or just show current counts if they want a pipeline view.
    # Let's just return the current snapshot which works well for pipeline visualization.
    
    funnel = [
        {"stage": "Pending", "count": status_counts.get(TicketStatus.pending_validation, 0) + status_counts.get(TicketStatus.routed, 0) + status_counts.get(TicketStatus.accepted, 0) + status_counts.get(TicketStatus.closed, 0)},
        {"stage": "Routed", "count": status_counts.get(TicketStatus.routed, 0) + status_counts.get(TicketStatus.accepted, 0) + status_counts.get(TicketStatus.closed, 0)},
        {"stage": "Accepted", "count": status_counts.get(TicketStatus.accepted, 0) + status_counts.get(TicketStatus.closed, 0)},
        {"stage": "Closed", "count": status_counts.get(TicketStatus.closed, 0)}
    ]
    
    return funnel

@router.get("/leaderboard", summary="Institution leaderboard")
async def get_leaderboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.government_officer]))
):
    """Get institution participation and reputation."""
    query = select(Institution).order_by(desc(Institution.reputation_score))
    result = await db.execute(query)
    institutions = result.scalars().all()
    
    data = []
    for inst in institutions:
        data.append({
            "id": inst.id,
            "name": inst.name,
            "type": inst.type.value,
            "reputation_score": round(inst.reputation_score, 2),
            "reputation_by_domain": inst.reputation_by_domain,
            "current_load": inst.current_load
        })
        
    return data

@router.get("/hotspots", summary="Active hotspot clusters")
async def get_hotspots(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.government_officer]))
):
    """Get active hotspot clusters for the map."""
    query = select(
        IssueCluster.id,
        IssueCluster.domain,
        IssueCluster.member_count,
        IssueCluster.aggregate_severity_score,
        func.ST_X(IssueCluster.centroid.cast(Geometry)).label("lon"),
        func.ST_Y(IssueCluster.centroid.cast(Geometry)).label("lat")
    ).where(IssueCluster.is_hotspot == True)
    
    result = await db.execute(query)
    rows = result.all()
    
    data = []
    for row in rows:
        data.append({
            "id": row.id,
            "domain": row.domain,
            "member_count": row.member_count,
            "severity": row.aggregate_severity_score,
            "lat": row.lat,
            "lon": row.lon
        })
        
    return data

@router.get("/trends", summary="Resolution rate and turnaround time trends")
async def get_trends(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.government_officer]))
):
    """Get daily trends for the last 7 days."""
    # For a demo, we will aggregate the tickets created in the last 7 days.
    # We will just generate some realistic looking trend data based on the DB if it exists,
    # or return an empty array that will be filled by the seed script.
    
    # We want to group by day. 
    data = []
    today = datetime.now(timezone.utc).date()
    
    for i in range(6, -1, -1):
        target_date = today - timedelta(days=i)
        
        # Simple count of closed tickets on that day
        # In SQLite/Postgres we could do grouping, but for cross-compatibility and small demo data, this is fine
        start_of_day = datetime(target_date.year, target_date.month, target_date.day, tzinfo=timezone.utc)
        end_of_day = start_of_day + timedelta(days=1)
        
        # Avg turnaround for closed tickets
        q_closed = select(Ticket.created_at, TicketEvent.created_at.label("closed_at")).join(
            TicketEvent, Ticket.id == TicketEvent.ticket_id
        ).where(
            Ticket.status == TicketStatus.closed,
            TicketEvent.event_type == EventType.closed,
            Ticket.created_at >= start_of_day,
            Ticket.created_at < end_of_day
        )
        res_closed = await db.execute(q_closed)
        closed_tickets = res_closed.all()
        
        turnaround = 0
        if closed_tickets:
            # Genuine turnaround computation based on TicketEvent closed status
            turnarounds = [(row.closed_at - row.created_at).total_seconds() / 3600 for row in closed_tickets]
            if turnarounds:
                turnaround = sum(turnarounds) / len(turnarounds)
                
        # Total tickets created that day
        q_all = select(func.count(Ticket.id)).where(
            Ticket.created_at >= start_of_day,
            Ticket.created_at < end_of_day
        )
        total_created = (await db.execute(q_all)).scalar() or 0
        
        rate = 0
        if total_created > 0:
            rate = (len(closed_tickets) / total_created) * 100
            
        # In a real demo if no data exists for the exact day, we might fake some small numbers, 
        # but the seed script will backdate tickets.
        data.append({
            "date": target_date.isoformat(),
            "resolution_rate": round(rate, 1),
            "avg_turnaround_hours": round(turnaround, 1)
        })
        
    return data
