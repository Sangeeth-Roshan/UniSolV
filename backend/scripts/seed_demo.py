import asyncio
import json
import numpy as np
import logging

from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, select

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.enums import UserRole, InstitutionType, TicketStatus, EventType
from app.models.user import User
from app.models.institution import Institution
from app.models.issue_cluster import IssueCluster
from app.models.ticket import Ticket
from app.models.ticket_event import TicketEvent

from app.services.clustering.ticket_cluster_service import process_new_ticket
from app.services.routing.escalation_engine import dispatch_ticket, check_sla_breaches
from app.ml.clustering.hotspot_detector import run_hotspot_detection

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def seed():
    logger.info("Starting demo seed...")
    
    db_url = settings.DATABASE_URL.replace("localhost", "127.0.0.1")
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as sess:
        # Load embedding model once
        from sentence_transformers import SentenceTransformer
        logger.info("Loading SentenceTransformer model...")
        model = SentenceTransformer("all-MiniLM-L6-v2")

        # Clear existing data
        logger.info("Clearing old data...")
        await sess.execute(text("TRUNCATE TABLE ticket_events, tickets, issue_clusters, users, institutions CASCADE"))
        await sess.commit()

        # 1. Institutions
        insts = [
            Institution(
                name="Central Tech University",
                type=InstitutionType.university,
                domains_of_expertise=["urban infrastructure", "public service delivery"],
                reputation_score=0.92,
                current_load=2,
                reputation_by_domain={"urban infrastructure": 0.95, "public service delivery": 0.89}
            ),
            Institution(
                name="AgriSci Institute",
                type=InstitutionType.university,
                domains_of_expertise=["agriculture", "water management"],
                reputation_score=0.85,
                current_load=1,
                reputation_by_domain={"agriculture": 0.88, "water management": 0.80}
            ),
            Institution(
                name="HealthCorp Partners",
                type=InstitutionType.company,
                domains_of_expertise=["healthcare", "sanitation"],
                reputation_score=0.75,
                current_load=4,
                reputation_by_domain={"healthcare": 0.78, "sanitation": 0.70}
            )
        ]
        sess.add_all(insts)
        await sess.flush()
        
        # 2. Users
        users = [
            User(
                name="Gov Officer Jane",
                email="admin@gov.in",
                password_hash=get_password_hash("demo123"),
                role=UserRole.government_officer
            ),
            User(
                name="Citizen Joe",
                email="citizen@test.com",
                password_hash=get_password_hash("demo123"),
                role=UserRole.citizen
            ),
            User(
                name="Uni Admin",
                email="uni@centraltech.edu",
                password_hash=get_password_hash("demo123"),
                role=UserRole.university_admin,
                institution_id=insts[0].id
            ),
            User(
                name="Company Rep",
                email="company@healthcorp.com",
                password_hash=get_password_hash("demo123"),
                role=UserRole.company,
                institution_id=insts[2].id
            )
        ]
        sess.add_all(users)
        await sess.flush()
        
        citizen_id = users[1].id
        
        await sess.commit()
        
        # 3. Load synthetic tickets
        logger.info("Loading synthetic tickets...")
        with open("data/synthetic_tickets.json", "r") as f:
            synthetic_data = json.load(f)
            
        subset = synthetic_data[:30] # take 30
        
        now = datetime.now(timezone.utc)
        
        # We will stagger creation times so trends chart looks realistic
        for i, data in enumerate(subset):
            # Stagger over last 7 days
            days_ago = (i % 7)
            created_at = now - timedelta(days=days_ago, hours=2)
            
            # Force first 5 tickets into the same domain and location to trigger a REAL hotspot
            if i < 5:
                lat = 28.6139 + (i * 0.0001)
                lon = 77.2090 + (i * 0.0001)
                domain = "environment" # Threshold is 4 for environment
            else:
                lat = data.get("lat", 23.0 + (i * 0.1))
                lon = data.get("lon", 85.0 + (i * 0.1))
                domain = data.get("domain", "unknown")
            
            # Generate real embedding
            embedding = model.encode(f"{data['title']}. {data['description']}", convert_to_numpy=True).astype(np.float32)
            
            t = Ticket(
                reporter_id=citizen_id,
                title=data["title"],
                description=data["description"],
                domain=domain,
                severity_score=data.get("severity_score", 0.5),
                status=TicketStatus.pending_validation,
                created_at=created_at,
                location=f"SRID=4326;POINT({lon} {lat})"
            )
            sess.add(t)
            await sess.flush()
            

            embedding = np.random.rand(384).astype(np.float32)
            # Classification and clustering
            await process_new_ticket(t, embedding, sess, lat=lat, lon=lon)
            
            # Routing
            if t.domain and t.domain != "unknown":
                await dispatch_ticket(t, sess)
                
            # If we want some closed tickets for the trend chart
            if days_ago > 3 and t.status == TicketStatus.routed and t.assigned_institution_id:
                t.status = TicketStatus.accepted
                sess.add(TicketEvent(ticket_id=t.id, event_type=EventType.accepted, created_at=t.created_at + timedelta(hours=1), notes="Accepted by inst"))
                
                t.status = TicketStatus.closed
                sess.add(TicketEvent(ticket_id=t.id, event_type=EventType.closed, created_at=t.created_at + timedelta(hours=48), notes="Resolved"))
                
                inst = await sess.get(Institution, t.assigned_institution_id)
                if inst and (inst.current_load or 0) > 0:
                    inst.current_load -= 1
                    
                from app.services.reputation.reputation_engine import compute_reputation_update
                await compute_reputation_update(t.assigned_institution_id, t, sess, is_sla_breach=False)
                
            # If it's one of the first 5, force SLA breach for escalation demo
            if i == 0:
                # Override the deadline set by dispatch_ticket
                t.sla_deadline = now - timedelta(hours=5)
                
        await sess.commit()
        
        # 4. Trigger Hotspot Detection
        logger.info("Running hotspot detection...")
        await run_hotspot_detection(sess)
        
        # 5. Trigger SLA Escalation
        logger.info("Running SLA escalation check...")
        await check_sla_breaches(sess)
        
    logger.info("Seed completed successfully.")

if __name__ == "__main__":
    asyncio.run(seed())
