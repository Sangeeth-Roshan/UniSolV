import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.core.config import settings
from app.models.issue_cluster import IssueCluster
from app.models.ticket import Ticket
from app.models.enums import TicketStatus

async def verify():
    print("=== SEED VERIFICATION QUERY ===")
    db_url = settings.DATABASE_URL.replace("localhost", "127.0.0.1")
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as sess:
        # 1. Hotspots
        q_hotspots = select(IssueCluster).where(IssueCluster.is_hotspot == True)
        res = await sess.execute(q_hotspots)
        hotspots = res.scalars().all()
        print(f"Hotspot Clusters Found: {len(hotspots)}")
        for h in hotspots:
            print(f"  - Cluster ID {h.id}: Domain={h.domain}, Members={h.member_count}, Severity={h.aggregate_severity_score}, Centroid={h.centroid}")
            
        # 2. Escalated Tickets
        q_escalated = select(Ticket).where(Ticket.status == TicketStatus.escalated)
        res2 = await sess.execute(q_escalated)
        escalated = res2.scalars().all()
        print(f"\nEscalated Tickets Found: {len(escalated)}")
        for t in escalated:
            print(f"  - Ticket ID {t.id}: Status={t.status.value}, SLA Deadline={t.sla_deadline}, Assigned To={t.assigned_institution_id}")
            
        print("\nAll Tickets:")
        q_all = select(Ticket).limit(5)
        all_t = (await sess.execute(q_all)).scalars().all()
        for t in all_t:
            print(f"  - ID {t.id}: Status={t.status.value}, SLA={t.sla_deadline}, Shortlist={t.routing_shortlist}")

        from app.models.ticket_event import TicketEvent
        from app.models.enums import EventType
        q_events = select(TicketEvent).where(TicketEvent.event_type == EventType.escalated)
        res_events = await sess.execute(q_events)
        esc_events = res_events.scalars().all()
        print(f"\nEscalation Events Found: {len(esc_events)}")
        for e in esc_events:
            print(f"  - Event ID {e.id} for Ticket {e.ticket_id}: {e.notes}")

if __name__ == "__main__":
    asyncio.run(verify())
