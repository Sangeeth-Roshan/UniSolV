import asyncio
from datetime import datetime, timedelta, timezone
import logging
from fastapi import HTTPException

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

from app.core.config import settings
from app.models.ticket import Ticket
from app.models.user import User
from app.models.institution import Institution
from app.models.enums import TicketStatus, UserRole
from app.services.routing.escalation_engine import dispatch_ticket, check_sla_breaches
from app.api.tickets import accept_ticket_endpoint

logging.basicConfig(level=logging.WARNING)

async def setup_test_data(session: AsyncSession):
    # create two institutions
    await session.execute(text("INSERT INTO institutions (id, name, type, reputation_score, current_load) VALUES (1, 'Inst 1', 'university', 1.0, 0) ON CONFLICT (id) DO NOTHING"))
    await session.execute(text("INSERT INTO institutions (id, name, type, reputation_score, current_load) VALUES (2, 'Inst 2', 'university', 0.9, 0) ON CONFLICT (id) DO NOTHING"))
    
    # create reporter
    await session.execute(text("INSERT INTO users (id, name, email, password_hash, role) VALUES (1, 'Reporter', 'rep@test.com', 'hash', 'citizen') ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role"))
    
    # create university admin for inst 1
    await session.execute(text("INSERT INTO users (id, name, email, password_hash, role, institution_id) VALUES (2, 'Admin 1', 'admin1@test.com', 'hash', 'university_admin', 1) ON CONFLICT (id) DO UPDATE SET institution_id=EXCLUDED.institution_id, role=EXCLUDED.role"))
    await session.commit()

async def run_scenario(scenario_name, accept_delay, escalate_delay):
    print(f"\n=== SCENARIO: {scenario_name} ===")
    
    db_url = settings.DATABASE_URL.replace("localhost", "127.0.0.1")
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as setup_sess:
        await setup_test_data(setup_sess)
        
        ticket = Ticket(
            reporter_id=1,
            title=f"Test Ticket - {scenario_name}",
            description="Testing race conditions",
            domain="urban infrastructure",
            status=TicketStatus.pending_validation
        )
        setup_sess.add(ticket)
        await setup_sess.commit()
        await setup_sess.refresh(ticket)
        
        await dispatch_ticket(ticket, setup_sess)
        await setup_sess.commit()
        
        ticket.sla_deadline = datetime.now(timezone.utc) - timedelta(hours=1)
        setup_sess.add(ticket)
        await setup_sess.commit()
        print(f"[CRIT-2] Dispatched to Inst {ticket.assigned_institution_id}, shortlist {ticket.routing_shortlist}")
    
    async with async_session() as sess1, async_session() as sess2:
        if ticket.assigned_institution_id == 10:
            user_id = 10
        else:
            user_id = 2 if ticket.assigned_institution_id == 1 else 3
        await sess1.execute(text(f"INSERT INTO users (id, name, email, password_hash, role, institution_id) VALUES (3, 'Admin 2', 'admin2@test.com', 'hash', 'university_admin', 2) ON CONFLICT (id) DO UPDATE SET institution_id=EXCLUDED.institution_id, role=EXCLUDED.role"))
        await sess1.commit()
        user = await sess1.get(User, user_id)
        
        async def do_accept():
            try:
                if accept_delay: await asyncio.sleep(accept_delay)
                await accept_ticket_endpoint(ticket.id, current_user=user, db=sess1)
                await sess1.commit()
                return "ACCEPTED"
            except HTTPException as e:
                await sess1.rollback()
                return f"HTTP {e.status_code}: {e.detail}"
            except Exception as e:
                await sess1.rollback()
                return f"ERROR: {e}"
        
        async def do_escalate():
            try:
                if escalate_delay: await asyncio.sleep(escalate_delay)
                res = await check_sla_breaches(sess2)
                return f"ESCALATED (count: {res.get('escalated')})"
            except Exception as e:
                await sess2.rollback()
                return f"ERROR: {e}"
        
        res_accept, res_escalate = await asyncio.gather(do_accept(), do_escalate())
        
        print(f"Outcome Accept: {res_accept}")
        print(f"Outcome Escalate: {res_escalate}")
        
        ticket_final = await sess1.get(Ticket, ticket.id)
        print(f"Final Status: {ticket_final.status}")
        print(f"Final Assigned Inst: {ticket_final.assigned_institution_id}")

async def run_scenario_sequential():
    print(f"\n=== SCENARIO: SEQUENTIAL ESCALATE THEN ACCEPT ===")
    
    db_url = settings.DATABASE_URL.replace("localhost", "127.0.0.1")
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as setup_sess:
        # Create ticket
        ticket = Ticket(
            reporter_id=1,
            title="Test Ticket - Sequential",
            description="Testing escalation then accept",
            domain="urban infrastructure",
            status=TicketStatus.pending_validation
        )
        setup_sess.add(ticket)
        await setup_sess.commit()
        await setup_sess.refresh(ticket)
        
        await dispatch_ticket(ticket, setup_sess)
        await setup_sess.commit()
        
        ticket.sla_deadline = datetime.now(timezone.utc) - timedelta(hours=1)
        setup_sess.add(ticket)
        await setup_sess.commit()
        print(f"[CRIT-2] Dispatched to Inst {ticket.assigned_institution_id}, shortlist {ticket.routing_shortlist}")
        
    async with async_session() as sess:
        # Escalate it
        res = await check_sla_breaches(sess)
        print(f"Escalation result: {res}")
        
        ticket_after_esc = await sess.get(Ticket, ticket.id)
        print(f"Ticket Status after escalate: {ticket_after_esc.status}")
        print(f"Assigned Inst after escalate: {ticket_after_esc.assigned_institution_id}")
        
        # New assigned institution accepts it
        if ticket_after_esc.assigned_institution_id == 10:
            user_id = 10
        else:
            user_id = 2 if ticket_after_esc.assigned_institution_id == 1 else 3
        user = await sess.get(User, user_id)
        
        try:
            await accept_ticket_endpoint(ticket.id, current_user=user, db=sess)
            await sess.commit()
            print("Acceptance result: ACCEPTED (HTTP 200)")
        except HTTPException as e:
            await sess.rollback()
            print(f"Acceptance result: HTTP {e.status_code}: {e.detail}")
            
        ticket_final = await sess.get(Ticket, ticket.id)
        print(f"Final Status: {ticket_final.status}")

async def run_test():
    await run_scenario("ACCEPT WINS (Escalate delayed)", accept_delay=0, escalate_delay=0.1)
    await run_scenario("ESCALATE WINS (Accept delayed)", accept_delay=0.1, escalate_delay=0)
    await run_scenario_sequential()

if __name__ == "__main__":
    asyncio.run(run_test())
