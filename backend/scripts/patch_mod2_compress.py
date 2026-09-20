import sys
import re

with open('app/ml/clustering/hotspot_detector.py', 'r') as f:
    content = f.read()

old_block = """async def _compress_sla(ticket_ids: list[int], db: AsyncSession) -> None:  # noqa: ARG001
    \"\"\"
    Stub: compress SLA deadlines for hotspot member tickets.
    Module 5 (escalation service) will implement the real logic.
    Called here to ensure the wiring is in place.
    \"\"\"
    logger.info(
        "compress_sla: stub called for %d tickets — Module 5 not yet implemented",
        len(ticket_ids),
    )"""

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
        # Halve the allocated time from created_at
        total_delta = t.sla_deadline - t.created_at
        new_delta = total_delta / 2
        t.sla_deadline = t.created_at + new_delta
        logger.info(f"Compressed SLA for ticket {t.id}: {total_delta} -> {new_delta}")
    
    await db.commit()"""

if old_block in content:
    with open('app/ml/clustering/hotspot_detector.py', 'w') as f:
        f.write(content.replace(old_block, new_block))
    print("hotspot_detector updated")
else:
    print("Block not found")
