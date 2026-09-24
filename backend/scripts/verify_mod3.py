import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

from app.core.config import settings
from app.models.ticket import Ticket
from app.models.institution import Institution
from app.models.enums import TicketStatus
from app.models.user import User
from app.services.routing.escalation_engine import dispatch_ticket
from app.api.tickets import close_ticket_endpoint

async def run_mod3_test():
    print("=== MOD-3 Verification ===")
    
    db_url = settings.DATABASE_URL.replace("localhost", "127.0.0.1")
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as sess:
        # Create a specific test institution
        await sess.execute(text("INSERT INTO institutions (id, name, type, reputation_score, current_load) VALUES (10, 'Load Test Inst', 'university', 1.0, 0) ON CONFLICT (id) DO UPDATE SET current_load=0"))
        # Create a test admin user for close endpoint
        await sess.execute(text("INSERT INTO users (id, name, email, password_hash, role, institution_id) VALUES (10, 'Load Admin', 'load@test.com', 'hash', 'university_admin', 10) ON CONFLICT (id) DO NOTHING"))
        await sess.commit()

        # Create two tickets targeting this institution
        ticket1 = Ticket(reporter_id=1, title="Load Ticket 1", description="test", domain="test_domain", status=TicketStatus.pending_validation)
        ticket2 = Ticket(reporter_id=1, title="Load Ticket 2", description="test", domain="test_domain", status=TicketStatus.pending_validation)
        sess.add_all([ticket1, ticket2])
        await sess.commit()
        await sess.refresh(ticket1)
        await sess.refresh(ticket2)
        
        print("Tickets created.")
        
        # Override rank_institutions for testing just to force it to inst 10
        import app.services.routing.escalation_engine
        original_rank = app.services.routing.escalation_engine.rank_institutions
        
        async def mock_rank(ticket, db, exclude_ids=None):
            return [10]
        
        app.services.routing.escalation_engine.rank_institutions = mock_rank
        
        await dispatch_ticket(ticket1, sess)
        await sess.commit()
        await dispatch_ticket(ticket2, sess)
        await sess.commit()
        
        # Restore original
        app.services.routing.escalation_engine.rank_institutions = original_rank
        
        inst = await sess.get(Institution, 10)
        print(f"After dispatching 2 tickets, Inst 10 current_load: {inst.current_load}")
        
        # Now close ticket 1
        user = await sess.get(User, 10)
        await close_ticket_endpoint(ticket1.id, current_user=user, db=sess)
        await sess.commit()
        
        await sess.refresh(inst)
        print(f"After closing 1 ticket, Inst 10 current_load: {inst.current_load}")

if __name__ == "__main__":
    asyncio.run(run_mod3_test())
