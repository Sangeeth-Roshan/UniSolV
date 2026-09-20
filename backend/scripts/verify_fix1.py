import asyncio
import requests
from datetime import timezone
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.models.ticket import Ticket
from app.models.ticket_event import TicketEvent
from app.models.enums import TicketStatus, EventType

async def verify():
    db_url = settings.DATABASE_URL.replace("localhost", "127.0.0.1")
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as sess:
        print("=== DATABASE VERIFICATION ===")
        # Get one closed ticket
        q_closed = select(Ticket).where(Ticket.status == TicketStatus.closed).limit(1)
        res = await sess.execute(q_closed)
        t = res.scalar_one_or_none()
        if not t:
            print("No closed tickets found!")
            return
            
        print(f"Ticket ID: {t.id}")
        print(f"Created At: {t.created_at}")
        
        # Get its closed event
        q_event = select(TicketEvent).where(
            TicketEvent.ticket_id == t.id,
            TicketEvent.event_type == EventType.closed
        ).limit(1)
        res_ev = await sess.execute(q_event)
        ev = res_ev.scalar_one_or_none()
        
        if not ev:
            print("No closed event found!")
            return
            
        print(f"Closed Event At: {ev.created_at}")
        
        diff = (ev.created_at - t.created_at).total_seconds() / 3600
        print(f"Computed Turnaround (hours): {diff:.2f}")
        
        print("\n=== API ENDPOINT VERIFICATION ===")
        # Get a token
        resp_auth = requests.post(
            "http://127.0.0.1:8000/api/auth/login",
            data={"username": "admin@gov.in", "password": "demo123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        token = resp_auth.json()["access_token"]
        
        # Query trends
        resp_trends = requests.get(
            "http://127.0.0.1:8000/api/analytics/trends",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = resp_trends.json()
        
        date_str = t.created_at.date().isoformat()
        
        for d in data:
            if d["date"] == date_str:
                print(f"Endpoint Data for {date_str}: {d}")
                print(f"Matches DB: {abs(d['avg_turnaround_hours'] - round(diff, 1)) < 0.1}")
                break

if __name__ == "__main__":
    asyncio.run(verify())
