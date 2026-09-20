import asyncio
import os
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from geoalchemy2.elements import WKTElement
import aiofiles

from app.core.database import get_db
from app.api.dependencies import get_current_user, require_role
from app.models.ticket import Ticket
from app.models.institution import Institution
from app.models.user import User
from app.models.enums import TicketStatus, EventType, IPOutcome, UserRole
from app.models.ticket_event import TicketEvent
from app.models.attribution import Attribution
from app.services.routing.escalation_engine import dispatch_ticket
from app.ml.classification_providers import get_classification_provider
from app.services.clustering.ticket_cluster_service import process_new_ticket

logger = logging.getLogger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------------
# Whisper / ffmpeg setup
# ---------------------------------------------------------------------------

# Add imageio_ffmpeg binary to PATH so whisper can find it
import imageio_ffmpeg  # noqa: E402
os.environ["PATH"] += os.pathsep + os.path.dirname(imageio_ffmpeg.get_ffmpeg_exe())

_whisper_model = None


def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        import whisper
        _whisper_model = whisper.load_model("tiny")
    return _whisper_model


# ---------------------------------------------------------------------------
# POST /api/tickets  — any authenticated user may file a ticket
# ---------------------------------------------------------------------------

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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a ticket with optional audio/media uploads.

    Requires: any authenticated user (all roles).
    The ``public_good_consent`` flag must be True — a 400 is returned otherwise.
    """
    if not public_good_consent:
        raise HTTPException(
            status_code=400,
            detail="Public-good licensing consent is required to submit a report.",
        )

    os.makedirs("uploads", exist_ok=True)
    media_urls = []
    transcribed_text = ""

    if audio and audio.filename:
        audio_path = f"uploads/{datetime.now().timestamp()}_{audio.filename}"
        async with aiofiles.open(audio_path, "wb") as out_file:
            content = await audio.read()
            await out_file.write(content)
        media_urls.append(audio_path)

        try:
            model = get_whisper_model()
            result = model.transcribe(audio_path)
            transcribed_text = result["text"]
            logger.info("Transcribed audio: %s", transcribed_text)
        except Exception as exc:  # noqa: BLE001
            logger.error("Whisper transcription failed: %s", exc)

    if media and media.filename:
        media_path = f"uploads/{datetime.now().timestamp()}_{media.filename}"
        async with aiofiles.open(media_path, "wb") as out_file:
            content = await media.read()
            await out_file.write(content)
        media_urls.append(media_path)

    final_description = description
    if transcribed_text:
        final_description += f"\n\n[Transcribed Voice Note]: {transcribed_text.strip()}"

    # Classification — classify() is synchronous and CPU-bound; run in thread
    # pool so we don't stall the asyncio event loop.
    provider = get_classification_provider()
    classification_result = await asyncio.get_event_loop().run_in_executor(
        None, provider.classify, title, final_description
    )

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
        classification_confidence=classification_result.confidence,
    )
    db.add(ticket)
    await db.flush()  # populate ticket.id before clustering

    # ── Clustering: assign ticket to an existing cluster or create a new one ──
    # Produce the embedding in a thread pool (CPU-bound, same model as classifier).
    try:
        from sentence_transformers import SentenceTransformer  # lazy import

        def _embed(text: str) -> "list[float]":
            model = SentenceTransformer("all-MiniLM-L6-v2")
            return model.encode(text, convert_to_numpy=True)

        embedding = await asyncio.get_event_loop().run_in_executor(
            None, _embed, f"{title}. {final_description}"
        )
        import numpy as np
        embedding = np.array(embedding, dtype=np.float32)

        await process_new_ticket(ticket, embedding, db, lat=lat, lon=lng)
    except Exception as exc:  # noqa: BLE001
        # Clustering failure must never block ticket creation
        logger.error("process_new_ticket failed for ticket %s — %s", ticket.id, exc)

    await db.commit()

    return {
        "status": "created",
        "ticket_id": ticket.id,
        "cluster_id": ticket.cluster_id,
        "domain": ticket.domain,
        "needs_human_review": classification_result.needs_human_review,
        "transcription": transcribed_text,
    }


# ---------------------------------------------------------------------------
# GET /api/tickets  — any authenticated user (role-filtered)
# ---------------------------------------------------------------------------

@router.get("")
async def get_tickets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return tickets visible to the requesting user.

    * citizens  — their own tickets only
    * institution roles — tickets assigned to their institution
    * government_officer — all tickets
    """
    query = select(Ticket).options(selectinload(Ticket.events))
    if current_user.role == UserRole.citizen:
        query = query.where(Ticket.reporter_id == current_user.id)
    elif current_user.role in (UserRole.university_admin, UserRole.student, UserRole.company):
        query = query.where(Ticket.assigned_institution_id == current_user.institution_id)
    # government_officer sees all — no additional filter

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
            "events": [
                {"type": e.event_type, "notes": e.notes, "time": e.created_at}
                for e in t.events
            ],
        }
        for t in tickets
    ]


# ---------------------------------------------------------------------------
# POST /api/tickets/{id}/dispatch  — government_officer only
# ---------------------------------------------------------------------------

@router.post("/{ticket_id}/dispatch")
async def dispatch_ticket_endpoint(
    ticket_id: int,
    current_user: User = Depends(require_role([UserRole.government_officer])),
    db: AsyncSession = Depends(get_db),
):
    """Manually dispatch a ticket to the best-ranked institution.

    Requires: ``government_officer``.
    """
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    await dispatch_ticket(ticket, db)
    await db.commit()
    return {"status": "dispatched", "assigned_to": ticket.assigned_institution_id}


# ---------------------------------------------------------------------------
# POST /api/tickets/{id}/accept  — institution members only
# ---------------------------------------------------------------------------

@router.post("/{ticket_id}/accept")
async def accept_ticket_endpoint(
    ticket_id: int,
    current_user: User = Depends(
        require_role([UserRole.university_admin, UserRole.student, UserRole.company])
    ),
    db: AsyncSession = Depends(get_db),
):
    """Institution explicitly accepts a routed ticket before SLA expires.

    Requires: ``university_admin``, ``student``, or ``company``.
    """
    # CRIT-3: FOR UPDATE lock
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id).with_for_update())
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket.status != TicketStatus.routed:
        raise HTTPException(status_code=400, detail="Ticket must be routed to be accepted")

    # Verify the caller belongs to the assigned institution
    if ticket.assigned_institution_id != current_user.institution_id:
        raise HTTPException(
            status_code=403,
            detail="You may only accept tickets assigned to your institution.",
        )

    ticket.status = TicketStatus.accepted
    event = TicketEvent(
        ticket_id=ticket.id,
        event_type=EventType.accepted,
        notes=f"Accepted by user {current_user.id} ({current_user.role.value}).",
    )
    db.add(event)
    await db.commit()
    return {"status": "accepted", "ticket_id": ticket_id}


# ---------------------------------------------------------------------------
# POST /api/tickets/{id}/proposal  — institution members only
# ---------------------------------------------------------------------------

class ProposalSubmit(BaseModel):
    industry_partner_id: Optional[int] = None


@router.post("/{ticket_id}/proposal")
async def submit_proposal(
    ticket_id: int,
    payload: ProposalSubmit,
    current_user: User = Depends(
        require_role([UserRole.university_admin, UserRole.student, UserRole.company])
    ),
    db: AsyncSession = Depends(get_db),
):
    """Record a proposal submission and initialise the attribution lineage.

    Requires: ``university_admin``, ``student``, or ``company``.
    """
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Verify the caller belongs to the assigned institution
    if ticket.assigned_institution_id != current_user.institution_id:
        raise HTTPException(
            status_code=403,
            detail="You may only submit proposals for tickets assigned to your institution.",
        )

    event = TicketEvent(
        ticket_id=ticket.id,
        event_type=EventType.proposal_submitted,
        notes=f"Proposal submitted by user {current_user.id}.",
    )
    db.add(event)

    # Create or update attribution record at proposal stage (spec requirement)
    attr_query = select(Attribution).where(Attribution.ticket_id == ticket_id)
    attr_res = await db.execute(attr_query)
    attribution = attr_res.scalars().first()

    if not attribution:
        attribution = Attribution(
            ticket_id=ticket_id,
            reporter_id=ticket.reporter_id,
            institution_id=ticket.assigned_institution_id,
            industry_partner_id=payload.industry_partner_id,
        )
        db.add(attribution)
    else:
        if payload.industry_partner_id:
            attribution.industry_partner_id = payload.industry_partner_id

    await db.commit()
    return {"status": "proposal_submitted"}


# ---------------------------------------------------------------------------
# POST /api/tickets/{id}/close  — government_officer or university_admin
# ---------------------------------------------------------------------------

@router.post("/{ticket_id}/close")
async def close_ticket_endpoint(
    ticket_id: int,
    current_user: User = Depends(
        require_role([UserRole.government_officer, UserRole.university_admin])
    ),
    db: AsyncSession = Depends(get_db),
):
    """Transition a ticket to closed and update institution reputation.

    Requires: ``government_officer`` or ``university_admin``.
    """
    from app.services.reputation.reputation_engine import compute_reputation_update

    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket.status == TicketStatus.closed:
        raise HTTPException(status_code=400, detail="Ticket is already closed")

    ticket.status = TicketStatus.closed

    # MOD-3: Decrement current_load when ticket is closed
    if ticket.assigned_institution_id:
        inst = await db.get(Institution, ticket.assigned_institution_id)
        if inst and (inst.current_load or 0) > 0:
            inst.current_load -= 1

    event = TicketEvent(
        ticket_id=ticket.id,
        event_type=EventType.closed,
        notes=f"Closed by user {current_user.id} ({current_user.role.value}).",
    )
    db.add(event)

    if ticket.assigned_institution_id:
        await compute_reputation_update(
            ticket.assigned_institution_id, ticket, db, is_sla_breach=False
        )

    await db.commit()
    return {"status": "closed", "ticket_id": ticket_id}


# ---------------------------------------------------------------------------
# PATCH /api/tickets/{id}/attribution  — university_admin only
# ---------------------------------------------------------------------------

class AttributionUpdate(BaseModel):
    ip_outcome: IPOutcome
    notes: Optional[str] = None


@router.patch("/{ticket_id}/attribution")
async def update_attribution(
    ticket_id: int,
    payload: AttributionUpdate,
    current_user: User = Depends(require_role([UserRole.university_admin])),
    db: AsyncSession = Depends(get_db),
):
    """Set the IP outcome on a closed ticket's attribution record.

    Requires: ``university_admin``.
    """
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket.status != TicketStatus.closed:
        raise HTTPException(
            status_code=400, detail="Ticket must be closed to finalise IP attribution."
        )

    attr_query = select(Attribution).where(Attribution.ticket_id == ticket_id)
    attr_res = await db.execute(attr_query)
    attribution = attr_res.scalars().first()

    if not attribution:
        raise HTTPException(
            status_code=404, detail="Attribution record not found for this ticket."
        )

    attribution.ip_outcome = payload.ip_outcome
    if payload.notes:
        attribution.notes = payload.notes

    await db.commit()
    return {"status": "attribution_updated"}
