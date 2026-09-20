import sys
import re

with open('app/ml/clustering/hotspot_detector.py', 'r') as f:
    content = f.read()

# find the function definition to the next "# ---" line
pattern = re.compile(r'async def _compress_sla\(ticket_ids: list\[int\], db: AsyncSession\) -> None:.*?# ---------------------------------------------------------------------------', re.DOTALL)

new_block = """async def _compress_sla(ticket_ids: list[int], db: AsyncSession) -> None:
    \"\"\"
    MOD-2: Compress SLA deadlines for hotspot member tickets.
    We halve the originally allocated SLA window (the time from created_at to sla_deadline)
    to compress the deadline now that it's a hotspot.
    \"\"\"
    if not ticket_ids:
        return
    
    from sqlalchemy import select
    from app.models.ticket import Ticket
    
    query = select(Ticket).where(Ticket.id.in_(ticket_ids), Ticket.sla_deadline.is_not(None))
    result = await db.execute(query)
    tickets = result.scalars().all()
    
    for t in tickets:
        total_delta = t.sla_deadline - t.created_at
        new_delta = total_delta / 2
        t.sla_deadline = t.created_at + new_delta
        logger.info(f"Compressed SLA for ticket {t.id}: {total_delta} -> {new_delta}")

# ---------------------------------------------------------------------------"""

if pattern.search(content):
    content = pattern.sub(new_block, content)
    with open('app/ml/clustering/hotspot_detector.py', 'w') as f:
        f.write(content)
    print("hotspot_detector updated")
else:
    print("Block not found via regex")
