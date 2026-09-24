import asyncio
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, select

from app.core.config import settings
from app.models.enums import TicketStatus, UserRole
from app.models.ticket import Ticket
from app.models.user import User
from app.models.institution import Institution
from app.models.attribution import Attribution
from app.api.tickets import submit_proposal, ProposalSubmit

async def test_attribution_endpoint():
    print("=== MIN-4: Testing Attribution Endpoint ===")
    
    db_url = settings.DATABASE_URL.replace("localhost", "127.0.0.1")
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as sess:
        # Create test inst
        await sess.execute(text("INSERT INTO institutions (id, name, type, reputation_score) VALUES (30, 'Test Inst', 'university', 1.0) ON CONFLICT (id) DO NOTHING"))
        # Create test user
        await sess.execute(text("INSERT INTO users (id, name, email, password_hash, role, institution_id) VALUES (30, 'Test User', 'attr@test.com', 'hash', 'university_admin', 30) ON CONFLICT (id) DO UPDATE SET role='university_admin', institution_id=30"))
        await sess.commit()

        # Create ticket assigned to inst 30
        ticket = Ticket(
            reporter_id=30,
            title="Attribution Test",
            description="Testing /proposal",
            domain="test",
            status=TicketStatus.accepted,
            assigned_institution_id=30,
            public_good_consent=True,
            public_good_consent_at=datetime.now(timezone.utc)
        )
        sess.add(ticket)
        await sess.commit()
        await sess.refresh(ticket)
        
        user = await sess.get(User, 30)
        
        print(f"Submitting proposal for ticket {ticket.id}")
        payload = ProposalSubmit(industry_partner_id=None)
        
        res = await submit_proposal(ticket.id, payload, current_user=user, db=sess)
        await sess.commit()
        print(f"Endpoint response: {res}")
        
        # Verify Attribution record exists in DB
        result = await sess.execute(select(Attribution).where(Attribution.ticket_id == ticket.id))
        attr = result.scalar_one_or_none()
        
        if attr:
            print(f"SUCCESS: Attribution record found (ID: {attr.id}, Inst: {attr.institution_id})")
        else:
            print("FAILURE: No Attribution record created!")

if __name__ == "__main__":
    asyncio.run(test_attribution_endpoint())
