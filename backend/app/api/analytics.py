import asyncio
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

@router.get("/summary", summary="Headline KPI numbers for the government dashboard")
async def get_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.government_officer]))
):
    """Return high-level platform statistics."""
    # Total tickets
    total_q = await db.execute(select(func.count(Ticket.id)))
    total = total_q.scalar() or 0

    # By-status counts
    status_q = select(Ticket.status, func.count(Ticket.id)).group_by(Ticket.status)
    status_rows = (await db.execute(status_q)).all()
    status_map = {(s.value if hasattr(s, 'value') else str(s)): c for s, c in status_rows}

    open_statuses = {"pending_validation", "routed", "accepted", "in_progress", "piloting"}
    open_count = sum(v for k, v in status_map.items() if k in open_statuses)
    closed_count = status_map.get("closed", 0)
    escalated_count = status_map.get("escalated", 0)
    resolution_rate = round((closed_count / total * 100) if total else 0, 1)

    # Avg severity
    avg_sev_q = await db.execute(select(func.avg(Ticket.severity_score)))
    avg_sev = round(float(avg_sev_q.scalar() or 0), 2)

    # Institutions count & avg load
    inst_q = await db.execute(select(
        func.count(Institution.id),
        func.avg(Institution.current_load),
        func.avg(Institution.reputation_score)
    ))
    inst_row = inst_q.one()
    inst_count = inst_row[0] or 0
    avg_load = round(float(inst_row[1] or 0), 1)
    avg_reputation = round(float(inst_row[2] or 0), 2)

    # Top domain by count
    top_domain_q = await db.execute(
        select(Ticket.domain, func.count(Ticket.id).label("cnt"))
        .where(Ticket.domain.isnot(None))
        .group_by(Ticket.domain)
        .order_by(desc(func.count(Ticket.id)))
        .limit(1)
    )
    top_row = top_domain_q.first()
    top_domain = top_row[0] if top_row else "N/A"
    top_domain_count = top_row[1] if top_row else 0

    # Tickets with contact phone (citizen reachability)
    phone_q = await db.execute(
        select(func.count(Ticket.id)).where(Ticket.contact_phone.isnot(None))
    )
    with_phone = phone_q.scalar() or 0

    return {
        "total_tickets": total,
        "open_tickets": open_count,
        "closed_tickets": closed_count,
        "escalated_tickets": escalated_count,
        "resolution_rate": resolution_rate,
        "avg_severity": avg_sev,
        "institution_count": inst_count,
        "avg_institution_load": avg_load,
        "avg_institution_reputation": avg_reputation,
        "top_domain": top_domain,
        "top_domain_count": top_domain_count,
        "tickets_with_contact": with_phone,
        "status_breakdown": status_map,
    }

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

@router.get("/ticket-locations", summary="Raw locations of all active tickets")
async def get_ticket_locations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.government_officer]))
):
    """Get active tickets with lat/lon for the map."""
    query = select(
        Ticket.id,
        Ticket.title,
        Ticket.domain,
        Ticket.status,
        Ticket.severity_score,
        func.ST_X(Ticket.location.cast(Geometry)).label("lon"),
        func.ST_Y(Ticket.location.cast(Geometry)).label("lat")
    ).where(Ticket.status != 'closed')
    
    result = await db.execute(query)
    rows = result.all()
    
    data = []
    for row in rows:
        if row.lat is not None and row.lon is not None:
            data.append({
                "id": row.id,
                "title": row.title,
                "domain": row.domain,
                "status": row.status,
                "severity": row.severity_score,
                "lon": row.lon,
                "lat": row.lat
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
    
    data = []
    today = datetime.now(timezone.utc).date()
    
    async def fetch_day(i: int):
        target_date = today - timedelta(days=i)
        start_of_day = datetime(target_date.year, target_date.month, target_date.day, tzinfo=timezone.utc)
        end_of_day = start_of_day + timedelta(days=1)
        
        q_closed = select(Ticket.created_at, TicketEvent.created_at.label("closed_at")).join(
            TicketEvent, Ticket.id == TicketEvent.ticket_id
        ).where(
            Ticket.status == TicketStatus.closed,
            TicketEvent.event_type == EventType.closed,
            Ticket.created_at >= start_of_day,
            Ticket.created_at < end_of_day
        )
        q_all = select(func.count(Ticket.id)).where(
            Ticket.created_at >= start_of_day,
            Ticket.created_at < end_of_day
        )
        
        # Execute concurrently for this day
        res_closed, res_all = await asyncio.gather(
            db.execute(q_closed),
            db.execute(q_all)
        )
        
        closed_tickets = res_closed.all()
        total_created = res_all.scalar() or 0
        
        turnaround = 0
        if closed_tickets:
            turnarounds = [(row.closed_at - row.created_at).total_seconds() / 3600 for row in closed_tickets]
            if turnarounds:
                turnaround = sum(turnarounds) / len(turnarounds)
                
        rate = 0
        if total_created > 0:
            rate = (len(closed_tickets) / total_created) * 100
            
        return {
            "date": target_date.isoformat(),
            "resolution_rate": round(rate, 1),
            "avg_turnaround_hours": round(turnaround, 1)
        }

    # Fetch all days concurrently
    results = await asyncio.gather(*(fetch_day(i) for i in range(6, -1, -1)))
    return list(results)


@router.get("/institution-workload", summary="Per-institution ticket breakdown for routing decisions")
async def get_institution_workload(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.government_officer]))
):
    """Full institution workload with per-status ticket counts and SLA compliance."""
    from sqlalchemy.orm import selectinload

    # All institutions
    inst_q = await db.execute(select(Institution).order_by(desc(Institution.reputation_score)))
    institutions = inst_q.scalars().all()

    now = datetime.now(timezone.utc)
    results = []

    # Fetch all assigned tickets in a single query to eliminate N+1 latency
    all_tickets_q = await db.execute(select(Ticket).where(Ticket.assigned_institution_id.isnot(None)))
    all_assigned_tickets = all_tickets_q.scalars().all()

    inst_tickets_map: Dict[int, List[Ticket]] = {}
    for t in all_assigned_tickets:
        if t.assigned_institution_id is not None:
            inst_tickets_map.setdefault(t.assigned_institution_id, []).append(t)

    for inst in institutions:
        tickets = inst_tickets_map.get(inst.id, [])

        status_counts: Dict[str, int] = {}
        sla_breached = 0
        sla_at_risk = 0
        sla_critical = 0
        total_closed = 0
        avg_response_hours = None
        response_times = []

        for t in tickets:
            s = t.status.value if hasattr(t.status, 'value') else str(t.status)
            status_counts[s] = status_counts.get(s, 0) + 1

            if s == "closed":
                total_closed += 1

            if t.sla_deadline:
                delta_h = (t.sla_deadline - now).total_seconds() / 3600
                if delta_h < 0:
                    sla_breached += 1
                elif delta_h < 6:
                    sla_critical += 1
                elif delta_h < 24:
                    sla_at_risk += 1

        total = len(tickets)
        resolution_rate = round((total_closed / total * 100) if total > 0 else 0, 1)

        # Capacity assessment
        load = inst.current_load or 0
        if load == 0:
            capacity_status = "available"
        elif load <= 5:
            capacity_status = "low_load"
        elif load <= 10:
            capacity_status = "moderate"
        else:
            capacity_status = "overloaded"

        results.append({
            "id": inst.id,
            "name": inst.name,
            "type": inst.type.value if hasattr(inst.type, 'value') else str(inst.type),
            "reputation_score": round(inst.reputation_score, 3),
            "current_load": load,
            "capacity_status": capacity_status,
            "domains_of_expertise": inst.domains_of_expertise or [],
            "reputation_by_domain": inst.reputation_by_domain or {},
            "total_tickets": total,
            "status_counts": status_counts,
            "resolution_rate": resolution_rate,
            "sla_breached": sla_breached,
            "sla_critical": sla_critical,
            "sla_at_risk": sla_at_risk,
        })

    return results


@router.get("/sla-risk", summary="Tickets at SLA risk — breached, critical, at-risk")
async def get_sla_risk(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.government_officer]))
):
    """Return active tickets grouped by SLA urgency level."""
    from sqlalchemy.orm import selectinload

    now = datetime.now(timezone.utc)

    # Active (non-closed, non-pending_validation) tickets with SLA
    q = await db.execute(
        select(Ticket).options(selectinload(Ticket.assigned_institution))
        .where(
            Ticket.sla_deadline.isnot(None),
            Ticket.status.notin_([TicketStatus.closed, TicketStatus.pending_validation])
        )
        .order_by(Ticket.sla_deadline.asc())
    )
    tickets = q.scalars().all()

    def classify(t: Ticket):
        hours = (t.sla_deadline - now).total_seconds() / 3600
        if hours < 0:
            return "breached"
        if hours < 6:
            return "critical"
        if hours < 24:
            return "at_risk"
        return "safe"

    def row(t: Ticket, level: str):
        inst = t.assigned_institution
        return {
            "id": t.id,
            "title": t.title,
            "domain": t.domain,
            "status": t.status.value if hasattr(t.status, 'value') else str(t.status),
            "severity_score": t.severity_score,
            "sla_deadline": t.sla_deadline.isoformat(),
            "sla_hours_remaining": round((t.sla_deadline - now).total_seconds() / 3600, 1),
            "sla_level": level,
            "assigned_institution": inst.name if inst else None,
            "institution_type": (inst.type.value if hasattr(inst.type, 'value') else str(inst.type)) if inst else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }

    breached, critical, at_risk, safe = [], [], [], []
    for t in tickets:
        level = classify(t)
        r = row(t, level)
        if level == "breached":
            breached.append(r)
        elif level == "critical":
            critical.append(r)
        elif level == "at_risk":
            at_risk.append(r)
        else:
            safe.append(r)

    return {
        "breached": breached,
        "critical": critical,
        "at_risk": at_risk,
        "safe": safe,
        "summary": {
            "total_active": len(tickets),
            "breached_count": len(breached),
            "critical_count": len(critical),
            "at_risk_count": len(at_risk),
            "safe_count": len(safe),
        }
    }


@router.get("/stale-tickets", summary="Tickets with no activity for 24+ hours")
async def get_stale_tickets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.government_officer]))
):
    """Return tickets that have been routed or accepted but show no progress."""
    from sqlalchemy.orm import selectinload

    now = datetime.now(timezone.utc)
    stale_threshold = now - timedelta(hours=24)

    # Routed or accepted tickets not updated in 24h
    q = await db.execute(
        select(Ticket).options(selectinload(Ticket.assigned_institution))
        .where(
            Ticket.status.in_([TicketStatus.routed, TicketStatus.accepted]),
            Ticket.updated_at < stale_threshold
        )
        .order_by(Ticket.updated_at.asc())
    )
    tickets = q.scalars().all()

    results = []
    for t in tickets:
        inst = t.assigned_institution
        hours_stale = round((now - t.updated_at).total_seconds() / 3600, 1)
        results.append({
            "id": t.id,
            "title": t.title,
            "domain": t.domain,
            "status": t.status.value if hasattr(t.status, 'value') else str(t.status),
            "severity_score": t.severity_score,
            "hours_stale": hours_stale,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
            "assigned_institution": inst.name if inst else "Unassigned",
            "sla_deadline": t.sla_deadline.isoformat() if t.sla_deadline else None,
            "sla_hours_remaining": round((t.sla_deadline - now).total_seconds() / 3600, 1) if t.sla_deadline else None,
        })

    return results
