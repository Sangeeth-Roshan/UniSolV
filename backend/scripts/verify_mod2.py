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
    print("=== MOD-2 Verification ===")
    
    db_url = settings.DATABASE_URL.replace("localhost", "127.0.0.1")
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as sess:
        # Create a cluster
        cluster = IssueCluster(
            centroid="SRID=4326;POINT(-122.4194 37.7749)",
            domain="mod2_domain",
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
                title=f"MOD-2 Ticket {i}",
                description="test",
                domain="mod2_domain",
                status=TicketStatus.routed,
                cluster_id=cluster.id,
                created_at=now - timedelta(hours=2),
                sla_deadline=now + timedelta(hours=46),
                location="SRID=4326;POINT(-122.4194 37.7749)"
            )
            sess.add(t)
            tickets.append(t)
            
        await sess.commit()
        for t in tickets:
            await sess.refresh(t)
            
        print(f"Cluster ID: {cluster.id}")
        
        for t in tickets:
            print(f"Ticket {t.id} original SLA deadline: {t.sla_deadline.isoformat()}")
            
        # Trigger hotspot detection (which will run _compress_sla)
        # We need to artificially make it a hotspot. Wait, run_hotspot_detection runs a DB query counting tickets.
        # It marks clusters with >= min_tickets as hotspot. Default is min_tickets=3.
        # We just created 3 tickets in this cluster!
        await run_hotspot_detection(sess)
        
        print("\nRan hotspot detection...")
        
        # Check if the cluster is now a hotspot
        await sess.refresh(cluster)
        print(f"Cluster is_hotspot: {cluster.is_hotspot}")
        
        for t in tickets:
            await sess.refresh(t)
            print(f"Ticket {t.id} NEW SLA deadline: {t.sla_deadline.isoformat()}")

if __name__ == "__main__":
    asyncio.run(run_mod2_test())
