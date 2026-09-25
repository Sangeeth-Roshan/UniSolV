import asyncio, sys
sys.path.insert(0, '/app')
from app.core.security import get_password_hash
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def reset():
    h = get_password_hash('admin123')
    async with AsyncSessionLocal() as session:
        await session.execute(
            text("UPDATE users SET password_hash=:h WHERE email=:email"),
            {'h': h, 'email': 'admin@gov.in'}
        )
        await session.commit()
    print('OK, new hash prefix:', h[:20])

asyncio.run(reset())
