import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

from app.core.config import settings
from app.models.ticket import Ticket
from app.models.institution import Institution
from app.models.enums import TicketStatus
from app.services.routing.escalation_engine import dispatch_ticket, check_sla_breaches

async def run_mod3_escalate_test():
    print("=== MOD-3 Escalation Load Transfer Verification ===")
    
    db_url = settings.DATABASE_URL.replace("localhost", "127.0.0.1")
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as sess:
        # Create inst A and inst B
        await sess.execute(text("INSERT INTO institutions (id, name, type, reputation_score, current_load) VALUES (20, 'Inst A', 'university', 1.0, 0) ON CONFLICT (id) DO UPDATE SET current_load=0, reputation_score=1.0"))
        await sess.execute(text("INSERT INTO institutions (id, name, type, reputation_score, current_load) VALUES (21, 'Inst B', 'university', 0.9, 0) ON CONFLICT (id) DO UPDATE SET current_load=0, reputation_score=0.9"))
        await sess.commit()

        # Create ticket
        ticket = Ticket(reporter_id=1, title="Load Escalation Ticket", description="test", domain="test_domain", status=TicketStatus.pending_validation)
        sess.add(ticket)
        await sess.commit()
        await sess.refresh(ticket)
        
        # Override rank_institutions for testing just to force it to inst 20 then 21
        import app.services.routing.escalation_engine
        original_rank = app.services.routing.escalation_engine.rank_institutions
        async def mock_rank(ticket, db, exclude_ids=None):
            return [20, 21]
        app.services.routing.escalation_engine.rank_institutions = mock_rank
        
        # Dispatch
        await dispatch_ticket(ticket, sess)
        await sess.commit()
        
        # Restore original
        app.services.routing.escalation_engine.rank_institutions = original_rank
        
        inst_a = await sess.get(Institution, 20)
        inst_b = await sess.get(Institution, 21)
        
        print(f"After dispatch:")
        print(f"  Inst A (20) load: {inst_a.current_load}")
        print(f"  Inst B (21) load: {inst_b.current_load}")
        print(f"  Assigned to: {ticket.assigned_institution_id}")
        
        # Force SLA breach
        ticket.sla_deadline = datetime.now(timezone.utc) - timedelta(hours=1)
        sess.add(ticket)
        await sess.commit()
        
        # Escalate
        await check_sla_breaches(sess)
        
        await sess.refresh(inst_a)
        await sess.refresh(inst_b)
        await sess.refresh(ticket)
        
        print(f"After escalation:")
        print(f"  Inst A (20) load: {inst_a.current_load}")
        print(f"  Inst B (21) load: {inst_b.current_load}")
        print(f"  Assigned to: {ticket.assigned_institution_id}")

if __name__ == "__main__":
    asyncio.run(run_mod3_escalate_test())
