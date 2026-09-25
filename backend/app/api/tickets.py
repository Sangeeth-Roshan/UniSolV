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
    title: str = Form(...),
    description: str = Form(...),
    public_good_consent: bool = Form(...),
    reporter_id: Optional[int] = Form(None),
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

    # If reporter_id not provided in form data, infer from current_user
    actual_reporter_id = reporter_id if reporter_id is not None else current_user.id

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
        reporter_id=actual_reporter_id,
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
    query = select(Ticket).options(
        selectinload(Ticket.events),
        selectinload(Ticket.assigned_institution),
    )
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
            "assigned_institution_id": t.assigned_institution_id,
            "proof_media_urls": t.proof_media_urls,
            "completion_notes": t.completion_notes,
            "created_at": t.created_at,
            "events": [
                {"type": e.event_type, "notes": e.notes, "time": e.created_at}
                for e in t.events
            ],
        }
        for t in tickets
    ]


# ---------------------------------------------------------------------------
# GET /api/tickets/{id}  — single ticket detail (role-filtered access)
# ---------------------------------------------------------------------------

@router.get("/{ticket_id}")
async def get_ticket(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return full detail of a single ticket.

    Access control:
    * citizens — own tickets only
    * institution roles — tickets assigned to their institution
    * government_officer — all tickets
    """
    result = await db.execute(
        select(Ticket)
        .options(
            selectinload(Ticket.events),
            selectinload(Ticket.assigned_institution),
            selectinload(Ticket.attributions),
        )
        .where(Ticket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if current_user.role == UserRole.citizen and ticket.reporter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role in (UserRole.university_admin, UserRole.student, UserRole.company):
        if ticket.assigned_institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Not authorized")

    return {
        "id": ticket.id,
        "title": ticket.title,
        "description": ticket.description,
        "domain": ticket.domain,
        "status": ticket.status,
        "severity_score": ticket.severity_score,
        "media_urls": ticket.media_urls,
        "proof_media_urls": ticket.proof_media_urls,
        "completion_notes": ticket.completion_notes,
        "assigned_institution_id": ticket.assigned_institution_id,
        "assigned_institution_name": ticket.assigned_institution.name if ticket.assigned_institution else None,
        "sla_deadline": ticket.sla_deadline,
        "created_at": ticket.created_at,
        "events": [
            {"type": e.event_type, "notes": e.notes, "time": e.created_at, "actor_id": e.actor_id}
            for e in ticket.events
        ],
    }


# ---------------------------------------------------------------------------
# POST /api/tickets/{id}/dispatch  — government_officer only
# ---------------------------------------------------------------------------

class DispatchPayload(BaseModel):
    institution_id: Optional[int] = None  # if provided, assign directly


@router.post("/{ticket_id}/dispatch")
async def dispatch_ticket_endpoint(
    ticket_id: int,
    payload: DispatchPayload = DispatchPayload(),
    current_user: User = Depends(require_role([UserRole.government_officer])),
    db: AsyncSession = Depends(get_db),
):
    """Dispatch a ticket to an institution.

    If ``institution_id`` is provided in the request body, assigns directly (manual).
    Otherwise uses AI ranking to select the best institution.

    Requires: ``government_officer``.
    """
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if payload.institution_id:
        # Manual assignment
        institution = await db.get(Institution, payload.institution_id)
        if not institution:
            raise HTTPException(status_code=404, detail="Institution not found")

        # Decrement old institution load if previously assigned
        if ticket.assigned_institution_id and ticket.assigned_institution_id != payload.institution_id:
            old_inst = await db.get(Institution, ticket.assigned_institution_id)
            if old_inst and (old_inst.current_load or 0) > 0:
                old_inst.current_load -= 1

        ticket.assigned_institution_id = payload.institution_id
        ticket.status = TicketStatus.routed
        institution.current_load = (institution.current_load or 0) + 1

        from datetime import timedelta
        sla_hours = 48.0
        ticket.sla_deadline = datetime.now(timezone.utc) + timedelta(hours=sla_hours)

        event = TicketEvent(
            ticket_id=ticket.id,
            event_type=EventType.routed,
            actor_id=current_user.id,
            notes=f"Manually assigned to institution {payload.institution_id} by govt officer {current_user.id}.",
        )
        db.add(event)
    else:
        # AI-powered auto dispatch
        await dispatch_ticket(ticket, db)

    await db.commit()
    return {"status": "dispatched", "assigned_to": ticket.assigned_institution_id}


# ---------------------------------------------------------------------------
# POST /api/tickets/{id}/start  — institution members only
# ---------------------------------------------------------------------------

@router.post("/{ticket_id}/start")
async def start_ticket(
    ticket_id: int,
    current_user: User = Depends(
        require_role([UserRole.university_admin, UserRole.student, UserRole.company])
    ),
    db: AsyncSession = Depends(get_db),
):
    """Institution marks a ticket as in_progress.

    Requires: ``university_admin``, ``student``, or ``company``.
    """
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id).with_for_update())
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.assigned_institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if ticket.status not in (TicketStatus.routed, TicketStatus.accepted):
        raise HTTPException(status_code=400, detail="Ticket must be routed or accepted to start")

    ticket.status = TicketStatus.in_progress
    event = TicketEvent(
        ticket_id=ticket.id,
        event_type=EventType.in_progress,
        actor_id=current_user.id,
        notes=f"Work started by user {current_user.id} ({current_user.name}).",
    )
    db.add(event)
    await db.commit()
    return {"status": "in_progress", "ticket_id": ticket_id}


# ---------------------------------------------------------------------------
# POST /api/tickets/{id}/complete  — institution members only (multipart)
# ---------------------------------------------------------------------------

@router.post("/{ticket_id}/complete")
async def complete_ticket(
    ticket_id: int,
    completion_notes: str = Form(""),
    worker_names: str = Form(""),   # comma-separated
    worker_roles: str = Form(""),   # comma-separated
    proof: Optional[UploadFile] = File(None),
    current_user: User = Depends(
        require_role([UserRole.university_admin, UserRole.student, UserRole.company])
    ),
    db: AsyncSession = Depends(get_db),
):
    """Institution submits proof of completion.

    Accepts an optional proof file upload along with completion notes and worker
    credit metadata. Transitions ticket to ``piloting`` (pending govt verification).

    Requires: ``university_admin``, ``student``, or ``company``.
    """
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id).with_for_update())
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.assigned_institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if ticket.status not in (TicketStatus.in_progress, TicketStatus.accepted):
        raise HTTPException(status_code=400, detail="Ticket must be in_progress or accepted")

    proof_urls = list(ticket.proof_media_urls) if ticket.proof_media_urls else []
    if proof and proof.filename:
        proof_path = f"uploads/proof_{datetime.now().timestamp()}_{proof.filename}"
        os.makedirs("uploads", exist_ok=True)
        async with aiofiles.open(proof_path, "wb") as out_file:
            content = await proof.read()
            await out_file.write(content)
        proof_urls.append(proof_path)

    ticket.proof_media_urls = proof_urls
    ticket.completion_notes = completion_notes
    ticket.status = TicketStatus.piloting  # pending govt verification

    # Build worker credits list
    names = [n.strip() for n in worker_names.split(",") if n.strip()]
    roles = [r.strip() for r in worker_roles.split(",") if r.strip()]
    credits_list = [
        {"name": name, "role": roles[i] if i < len(roles) else "contributor"}
        for i, name in enumerate(names)
    ]

    # Update or create attribution record
    attr_res = await db.execute(select(Attribution).where(Attribution.ticket_id == ticket_id))
    attribution = attr_res.scalars().first()
    if not attribution:
        attribution = Attribution(
            ticket_id=ticket_id,
            reporter_id=ticket.reporter_id,
            institution_id=ticket.assigned_institution_id,
            worker_credits=credits_list,
        )
        db.add(attribution)
    else:
        attribution.worker_credits = credits_list

    event = TicketEvent(
        ticket_id=ticket.id,
        event_type=EventType.completed,
        actor_id=current_user.id,
        notes=f"Completion submitted by {current_user.name}. Notes: {completion_notes[:200] if completion_notes else 'N/A'}",
    )
    db.add(event)
    await db.commit()
    return {"status": "completed", "ticket_id": ticket_id, "proof_count": len(proof_urls)}


# ---------------------------------------------------------------------------
# POST /api/tickets/{id}/verify  — government_officer only
# ---------------------------------------------------------------------------

@router.post("/{ticket_id}/verify")
async def verify_ticket(
    ticket_id: int,
    current_user: User = Depends(require_role([UserRole.government_officer])),
    db: AsyncSession = Depends(get_db),
):
    """Government officer verifies completed work.

    Transitions ticket from ``piloting`` to ``verified``.

    Requires: ``government_officer``.
    """
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.status != TicketStatus.piloting:
        raise HTTPException(status_code=400, detail="Ticket must be in piloting/pending-verification state")

    ticket.status = TicketStatus.verified
    event = TicketEvent(
        ticket_id=ticket.id,
        event_type=EventType.verified,
        actor_id=current_user.id,
        notes=f"Resolution verified by government officer {current_user.id} ({current_user.name}).",
    )
    db.add(event)
    await db.commit()
    return {"status": "verified", "ticket_id": ticket_id}


# ---------------------------------------------------------------------------
# POST /api/tickets/{id}/rate  — citizen only
# ---------------------------------------------------------------------------

class RatePayload(BaseModel):
    score: int  # 1-5
    comment: Optional[str] = None


@router.post("/{ticket_id}/rate")
async def rate_ticket(
    ticket_id: int,
    payload: RatePayload,
    current_user: User = Depends(require_role([UserRole.citizen])),
    db: AsyncSession = Depends(get_db),
):
    """Citizen rates the resolution of their ticket (1–5 stars).

    Requires: ``citizen``.
    """
    from app.models.rating import Rating

    if not 1 <= payload.score <= 5:
        raise HTTPException(status_code=400, detail="Score must be between 1 and 5")

    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.reporter_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only rate your own tickets")
    if ticket.status not in (TicketStatus.verified, TicketStatus.closed):
        raise HTTPException(status_code=400, detail="Ticket must be verified or closed to rate")

    existing = await db.execute(
        select(Rating).where(Rating.ticket_id == ticket_id, Rating.rated_by == current_user.id)
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="You have already rated this ticket")

    rating = Rating(
        ticket_id=ticket_id,
        rated_by=current_user.id,
        score=payload.score,
        comment=payload.comment,
    )
    db.add(rating)
    await db.commit()
    return {"status": "rated", "score": payload.score}


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
