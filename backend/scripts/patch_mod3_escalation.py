import sys
import re

with open('app/services/routing/escalation_engine.py', 'r') as f:
    content = f.read()

# 1. Update dispatch_ticket
old_dispatch = """    top_choice = shortlist.pop(0)
    ticket.routing_shortlist = shortlist
    ticket.assigned_institution_id = top_choice
    ticket.status = TicketStatus.routed"""

new_dispatch = """    top_choice = shortlist.pop(0)
    ticket.routing_shortlist = shortlist
    ticket.assigned_institution_id = top_choice
    ticket.status = TicketStatus.routed
    
    # MOD-3: Increment load on dispatch
    inst = await db.get(Institution, top_choice)
    if inst:
        inst.current_load = (inst.current_load or 0) + 1"""

content = content.replace(old_dispatch, new_dispatch)

# 2. Update check_sla_breaches for decrementing failed inst
old_sla_dec = """            # Penalize failed institution
            if failed_inst_id:
                from app.services.reputation.reputation_engine import compute_reputation_update
                await compute_reputation_update(failed_inst_id, ticket, db, is_sla_breach=True)"""

new_sla_dec = """            # Penalize failed institution
            if failed_inst_id:
                failed_inst = await db.get(Institution, failed_inst_id)
                if failed_inst and (failed_inst.current_load or 0) > 0:
                    failed_inst.current_load -= 1
                from app.services.reputation.reputation_engine import compute_reputation_update
                await compute_reputation_update(failed_inst_id, ticket, db, is_sla_breach=True)"""

content = content.replace(old_sla_dec, new_sla_dec)

# 3. Update check_sla_breaches for incrementing new inst
old_sla_inc = """                ticket.assigned_institution_id = next_choice
                ticket.routing_shortlist = shortlist
                ticket.sla_deadline = now + timedelta(hours=24) # New SLA for escalated"""

new_sla_inc = """                ticket.assigned_institution_id = next_choice
                new_inst = await db.get(Institution, next_choice)
                if new_inst:
                    new_inst.current_load = (new_inst.current_load or 0) + 1
                ticket.routing_shortlist = shortlist
                ticket.sla_deadline = now + timedelta(hours=24) # New SLA for escalated"""

content = content.replace(old_sla_inc, new_sla_inc)

with open('app/services/routing/escalation_engine.py', 'w') as f:
    f.write(content)
print("Escalation engine updated.")
