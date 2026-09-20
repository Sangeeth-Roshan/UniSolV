import sys

with open('app/services/routing/escalation_engine.py', 'r') as f:
    content = f.read()

old_block = """            if shortlist:
                next_choice = shortlist.pop(0)
                ticket.assigned_institution_id = next_choice
                new_inst = await db.get(Institution, next_choice)
                if new_inst:
                    new_inst.current_load = (new_inst.current_load or 0) + 1
                ticket.routing_shortlist = shortlist
                ticket.sla_deadline = now + timedelta(hours=24) # New SLA for escalated
                ticket.status = TicketStatus.escalated  # Fixes CRIT-5 double loop

                event = TicketEvent("""

new_block = """            if shortlist:
                next_choice = shortlist.pop(0)
                ticket.assigned_institution_id = next_choice
                new_inst = await db.get(Institution, next_choice)
                if new_inst:
                    new_inst.current_load = (new_inst.current_load or 0) + 1
                ticket.routing_shortlist = shortlist
                ticket.sla_deadline = now + timedelta(hours=24) # New SLA for escalated
                # Per CRIT-5 follow-up: set status back to 'routed' so new inst can accept
                ticket.status = TicketStatus.routed

                event = TicketEvent("""

old_else_block = """                logger.warning(f"Ticket {ticket.id} escalated but no more institutions available.")"""

new_else_block = """                logger.warning(f"Ticket {ticket.id} escalated but no more institutions available.")
                ticket.status = TicketStatus.escalated  # Terminal state"""

if old_block in content:
    content = content.replace(old_block, new_block)
    content = content.replace(old_else_block, new_else_block)
    with open('app/services/routing/escalation_engine.py', 'w') as f:
        f.write(content)
    print("escalation_engine updated for CRIT-5 follow-up.")
else:
    print("Block not found!")
