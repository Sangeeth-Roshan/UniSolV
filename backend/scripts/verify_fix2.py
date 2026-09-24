import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.models.institution import Institution

async def verify():
    db_url = settings.DATABASE_URL.replace("localhost", "127.0.0.1")
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as sess:
        print("=== INSTITUTION LEADERBOARD AFTER FIX ===")
        q = select(Institution).order_by(Institution.id)
        res = await sess.execute(q)
        insts = res.scalars().all()
        for inst in insts:
            print(f"- {inst.name}:")
            print(f"  Current Load: {inst.current_load}")
            print(f"  Reputation Score: {inst.reputation_score:.4f}")
            print(f"  Reputation by Domain: {inst.reputation_by_domain}")
            
if __name__ == "__main__":
    asyncio.run(verify())
