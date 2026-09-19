import os
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from geoalchemy2.elements import WKTElement
import aiofiles

from app.core.database import get_db
from app.models.ticket import Ticket
from app.models.enums import TicketStatus, EventType, IPOutcome
from app.models.ticket_event import TicketEvent
from app.models.attribution import Attribution
from app.services.routing.escalation_engine import dispatch_ticket
from app.ml.classification_providers import get_classification_provider

logger = logging.getLogger(__name__)
router = APIRouter()

# Add imageio_ffmpeg binary to PATH so whisper can find it
import imageio_ffmpeg
os.environ["PATH"] += os.pathsep + os.path.dirname(imageio_ffmpeg.get_ffmpeg_exe())

# Lazy load whisper model
_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        import whisper
        # Use tiny for speed in this demo
        _whisper_model = whisper.load_model("tiny")
    return _whisper_model


@router.post("")
async def create_ticket(
    reporter_id: int = Form(...),
    title: str = Form(...),
    description: str = Form(...),
    public_good_consent: bool = Form(...),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
    audio: Optional[UploadFile] = File(None),
    media: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db)
):
    """Create a ticket with optional audio/media uploads, requiring open/public-good licensing consent."""
    if not public_good_consent:
        raise HTTPException(
            status_code=400, 
            detail="Public-good licensing consent is required to submit a report."
        )
        
    os.makedirs("uploads", exist_ok=True)
    media_urls = []
    transcribed_text = ""
    
    if audio and audio.filename:
        # Save audio file
        audio_path = f"uploads/{datetime.now().timestamp()}_{audio.filename}"
        async with aiofiles.open(audio_path, 'wb') as out_file:
            content = await audio.read()
            await out_file.write(content)
        media_urls.append(audio_path)
        
        # Transcribe audio using Whisper
        try:
            model = get_whisper_model()
            # whisper model expects a path
            result = model.transcribe(audio_path)
            transcribed_text = result["text"]
            logger.info(f"Transcribed audio: {transcribed_text}")
        except Exception as e:
            logger.error(f"Whisper transcription failed: {e}")
            
    if media and media.filename:
        media_path = f"uploads/{datetime.now().timestamp()}_{media.filename}"
        async with aiofiles.open(media_path, 'wb') as out_file:
            content = await media.read()
            await out_file.write(content)
        media_urls.append(media_path)
        
    final_description = description
    if transcribed_text:
        final_description += f"\n\n[Transcribed Voice Note]: {transcribed_text.strip()}"
        
    # Classification pipeline
    provider = get_classification_provider()
    # It might be an async method or sync method, let's assume async if we check Module 3. Wait, is it async?
    # Usually `classify` is async.
    # We can try to await it. If it fails with TypeError, we fallback to sync.
    try:
        classification_result = await provider.classify(title, final_description)
    except TypeError:
        classification_result = provider.classify(title, final_description)
        
    location = None
    if lat is not None and lng is not None:
        location = WKTElement(f"POINT({lng} {lat})", srid=4326)

    ticket = Ticket(
        reporter_id=reporter_id,
        title=title,
        description=final_description,
        public_good_consent=True,
        public_good_consent_at=datetime.now(timezone.utc),
        media_urls=media_urls,
        location=location,
        domain=classification_result.domain,
        severity_score=classification_result.severity_score,
        classification_confidence=classification_result.confidence
    )
    db.add(ticket)
    await db.commit()
    
    # We can also automatically dispatch the ticket if confidence is high enough
    # or just leave it pending_validation.
    
    return {
        "status": "created", 
        "ticket_id": ticket.id, 
        "domain": ticket.domain,
        "transcription": transcribed_text
    }

from app.api.dependencies import get_current_user, require_role
from app.models.user import User
from app.models.enums import UserRole
from sqlalchemy.orm import selectinload

@router.get("")
async def get_tickets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Ticket).options(selectinload(Ticket.events))
    if current_user.role == UserRole.citizen:
        query = query.where(Ticket.reporter_id == current_user.id)
    elif current_user.role in [UserRole.university_admin, UserRole.student, UserRole.company]:
        query = query.where(Ticket.assigned_institution_id == current_user.institution_id)
    # government officer sees all
    
    result = await db.execute(query.order_by(Ticket.created_at.desc()))
    tickets = result.scalars().all()
    
    return [
        {
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "domain": t.domain,
            "status": t.status,
            "severity_score": t.severity_score,
            "events": [{"type": e.event_type, "notes": e.notes, "time": e.created_at} for e in t.events]
        } for t in tickets
    ]

@router.post("/{ticket_id}/dispatch")
async def dispatch_ticket_endpoint(ticket_id: int, db: AsyncSession = Depends(get_db)):
    """Manually dispatch a ticket to the best institution."""
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    await dispatch_ticket(ticket, db)
    await db.commit()
    return {"status": "dispatched", "assigned_to": ticket.assigned_institution_id}

@router.post("/{ticket_id}/accept")
async def accept_ticket_endpoint(ticket_id: int, db: AsyncSession = Depends(get_db)):
    """Institution explicitly accepts a routed ticket before SLA expires."""
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    if ticket.status != TicketStatus.routed:
        raise HTTPException(status_code=400, detail="Ticket must be routed to be accepted")
        
    ticket.status = TicketStatus.accepted
    event = TicketEvent(
        ticket_id=ticket.id,
        event_type=EventType.accepted,
        notes="Institution accepted the ticket."
    )
    db.add(event)
    await db.commit()
    return {"status": "accepted", "ticket_id": ticket_id}

class ProposalSubmit(BaseModel):
    industry_partner_id: Optional[int] = None

@router.post("/{ticket_id}/proposal")
async def submit_proposal(ticket_id: int, payload: ProposalSubmit, db: AsyncSession = Depends(get_db)):
    """Records a proposal submission and initializes the attribution lineage."""
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    event = TicketEvent(
        ticket_id=ticket.id, 
        event_type=EventType.proposal_submitted, 
        notes="Proposal submitted"
    )
    db.add(event)
    
    # Create or update attribution record
    attr_query = select(Attribution).where(Attribution.ticket_id == ticket_id)
    attr_res = await db.execute(attr_query)
    attribution = attr_res.scalars().first()
    
    if not attribution:
        attribution = Attribution(
            ticket_id=ticket_id,
            reporter_id=ticket.reporter_id,
            institution_id=ticket.assigned_institution_id,
            industry_partner_id=payload.industry_partner_id
        )
        db.add(attribution)
    else:
        if payload.industry_partner_id:
            attribution.industry_partner_id = payload.industry_partner_id
        
    await db.commit()
    return {"status": "proposal_submitted"}

@router.post("/{ticket_id}/close")
async def close_ticket_endpoint(ticket_id: int, db: AsyncSession = Depends(get_db)):
    """Transitions a ticket to closed (verified) and updates institution reputation."""
    from app.services.reputation.reputation_engine import compute_reputation_update
    
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    if ticket.status == TicketStatus.closed:
        raise HTTPException(status_code=400, detail="Ticket is already closed")
        
    ticket.status = TicketStatus.closed
    event = TicketEvent(
        ticket_id=ticket.id,
        event_type=EventType.closed,
        notes="Ticket verified and closed."
    )
    db.add(event)
    
    if ticket.assigned_institution_id:
        await compute_reputation_update(ticket.assigned_institution_id, ticket, db, is_sla_breach=False)
        
    await db.commit()
    return {"status": "closed", "ticket_id": ticket_id}

class AttributionUpdate(BaseModel):
    ip_outcome: IPOutcome
    notes: Optional[str] = None

@router.patch("/{ticket_id}/attribution")
async def update_attribution(ticket_id: int, payload: AttributionUpdate, db: AsyncSession = Depends(get_db)):
    """Institution admin explicitly sets the IP outcome on a closed ticket."""
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    if ticket.status != TicketStatus.closed:
        raise HTTPException(status_code=400, detail="Ticket must be closed to finalize IP attribution.")
        
    attr_query = select(Attribution).where(Attribution.ticket_id == ticket_id)
    attr_res = await db.execute(attr_query)
    attribution = attr_res.scalars().first()
    
    if not attribution:
        raise HTTPException(status_code=404, detail="Attribution record not found for this ticket.")
        
    attribution.ip_outcome = payload.ip_outcome
    if payload.notes:
        attribution.notes = payload.notes
        
    await db.commit()
    return {"status": "attribution_updated"}
