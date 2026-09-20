import sys

with open('app/api/tickets.py', 'r') as f:
    content = f.read()

old_block = """    ticket.status = TicketStatus.closed
    event = TicketEvent(
        ticket_id=ticket.id,"""

new_block = """    ticket.status = TicketStatus.closed

    # MOD-3: Decrement current_load when ticket is closed
    if ticket.assigned_institution_id:
        inst = await db.get(Institution, ticket.assigned_institution_id)
        if inst and (inst.current_load or 0) > 0:
            inst.current_load -= 1

    event = TicketEvent(
        ticket_id=ticket.id,"""

if old_block in content:
    with open('app/api/tickets.py', 'w') as f:
        f.write(content.replace(old_block, new_block))
    print("close_ticket_endpoint updated")
else:
    print("Block not found")
