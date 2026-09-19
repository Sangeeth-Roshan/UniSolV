import asyncio
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.enums import UserRole
from app.core.security import get_password_hash
from sqlalchemy import select, text

async def seed():
    async with AsyncSessionLocal() as db:
        await db.execute(text("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))"))
        roles = [UserRole.citizen, UserRole.government_officer, UserRole.university_admin]
        for i, role in enumerate(roles):
            email = f'{role.name}@test.com'
            res = await db.execute(select(User).where(User.email == email))
            if res.scalars().first():
                continue
            user = User(
                name=role.name,
                email=email,
                password_hash=get_password_hash('password123'),
                role=role
            )
            db.add(user)
        await db.commit()
        print('Users seeded successfully')

asyncio.run(seed())
