import sys

with open('app/api/tickets.py', 'r') as f:
    content = f.read()

old_block = '''    """Institution explicitly accepts a routed ticket before SLA expires.

    Requires: ``university_admin``, ``student``, or ``company``.
    """
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:'''

new_block = '''    """Institution explicitly accepts a routed ticket before SLA expires.

    Requires: ``university_admin``, ``student``, or ``company``.
    """
    # CRIT-3: FOR UPDATE lock
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id).with_for_update())
    ticket = result.scalar_one_or_none()
    
    if not ticket:'''

if old_block in content:
    with open('app/api/tickets.py', 'w') as f:
        f.write(content.replace(old_block, new_block))
    print('Replaced successfully')
else:
    print('Block not found')
