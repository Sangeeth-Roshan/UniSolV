import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, select

from app.core.config import settings
from app.models.ticket import Ticket
from app.models.enums import TicketStatus
from app.models.issue_cluster import IssueCluster
from app.ml.clustering.hotspot_detector import run_hotspot_detection

async def run_mod2_test():
    print("=== MOD-2 Verification (Double Run) ===")
    
    db_url = settings.DATABASE_URL.replace("localhost", "127.0.0.1")
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as sess:
        # Create a cluster
        cluster = IssueCluster(
            centroid="SRID=4326;POINT(-74.0060 40.7128)",
            domain="mod2_double",
            is_hotspot=False
        )
        sess.add(cluster)
        await sess.commit()
        await sess.refresh(cluster)
        
        now = datetime.now(timezone.utc)
        
        # Create 5 tickets in this cluster
        tickets = []
        for i in range(5):
            t = Ticket(
                reporter_id=1,
                title=f"MOD-2 Double {i}",
                description="test",
                domain="mod2_double",
                status=TicketStatus.routed,
                cluster_id=cluster.id,
                created_at=now - timedelta(hours=2),
                sla_deadline=now + timedelta(hours=46),
                location="SRID=4326;POINT(-74.0060 40.7128)"
            )
            sess.add(t)
            tickets.append(t)
            
        await sess.commit()
        for t in tickets:
            await sess.refresh(t)
            
        print(f"Cluster ID: {cluster.id}")
        
        print(f"Ticket 0 original SLA deadline: {tickets[0].sla_deadline.isoformat()}")
            
        # Run hotspot detection first time
        await run_hotspot_detection(sess)
        
        print("\nRan hotspot detection (Run 1)...")
        await sess.refresh(cluster)
        print(f"Cluster is_hotspot: {cluster.is_hotspot}")
        
        for t in tickets:
            await sess.refresh(t)
        
        first_run_deadline = tickets[0].sla_deadline.isoformat()
        print(f"Ticket 0 SLA deadline after Run 1: {first_run_deadline}")

        # Run hotspot detection second time
        await run_hotspot_detection(sess)
        print("\nRan hotspot detection (Run 2)...")
        
        for t in tickets:
            await sess.refresh(t)
            
        second_run_deadline = tickets[0].sla_deadline.isoformat()
        print(f"Ticket 0 SLA deadline after Run 2: {second_run_deadline}")
        
        if first_run_deadline == second_run_deadline:
            print("SUCCESS: SLA shifted only once.")
        else:
            print("FAILURE: SLA shifted twice!")

if __name__ == "__main__":
    asyncio.run(run_mod2_test())
