import sys
import re

with open('scripts/verify_crit2_3_5.py', 'r') as f:
    content = f.read()

# Add a third scenario call at the bottom
old_run_test = """async def run_test():
    await run_scenario("ACCEPT WINS (Escalate delayed)", accept_delay=0, escalate_delay=0.1)
    await run_scenario("ESCALATE WINS (Accept delayed)", accept_delay=0.1, escalate_delay=0)"""

new_run_test = """async def run_scenario_sequential():
    print(f"\\n=== SCENARIO: SEQUENTIAL ESCALATE THEN ACCEPT ===")
    
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
    await run_scenario_sequential()"""

if old_run_test in content:
    content = content.replace(old_run_test, new_run_test)
    with open('scripts/verify_crit2_3_5.py', 'w') as f:
        f.write(content)
    print("verify_crit2_3_5.py updated with sequential scenario.")
else:
    print("Could not find run_test block in verify_crit2_3_5.py!")
