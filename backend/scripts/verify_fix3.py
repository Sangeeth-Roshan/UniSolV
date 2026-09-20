import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.models.issue_cluster import IssueCluster
from app.models.ticket import Ticket

async def verify():
    db_url = settings.DATABASE_URL.replace("localhost", "127.0.0.1")
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as sess:
        print("=== DUPLICATE CLUSTERING WITH REAL EMBEDDINGS ===")
        q = select(IssueCluster).where(IssueCluster.member_count > 1).order_by(IssueCluster.id)
        res = await sess.execute(q)
        clusters = res.scalars().all()
        for c in clusters:
            print(f"\nCluster {c.id} (Domain: {c.domain}):")
            q_t = select(Ticket).where(Ticket.cluster_id == c.id)
            t_res = await sess.execute(q_t)
            for t in t_res.scalars().all():
                print(f"  - Ticket {t.id}: {t.title}")
            
if __name__ == "__main__":
    asyncio.run(verify())
