"""
Institutions API.

GET  /api/institutions                         — list all approved institutions
GET  /api/institutions/{id}/reputation         — per-institution reputation scores

POST /api/institutions/apply                   — any user submits a university registration application
GET  /api/institutions/applications            — govt officer views all applications
POST /api/institutions/applications/{id}/approve — govt officer approves application
POST /api/institutions/applications/{id}/reject  — govt officer rejects application
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.dependencies import get_current_user, require_role
from app.models.institution import Institution
from app.models.institution_application import InstitutionApplication
from app.models.user import User
from app.models.enums import ApplicationStatus, InstitutionType, UserRole

router = APIRouter()


# ---------------------------------------------------------------------------
# GET /api/institutions — list all approved institutions
# ---------------------------------------------------------------------------

@router.get("")
async def list_institutions(
    _current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all institutions (for admin assignment UI).

    Requires: any authenticated user.
    """
    result = await db.execute(select(Institution).order_by(Institution.name))
    institutions = result.scalars().all()
    return [
        {
            "id": i.id,
            "name": i.name,
            "type": i.type,
            "domains_of_expertise": i.domains_of_expertise,
            "reputation_score": i.reputation_score,
            "current_load": i.current_load,
        }
        for i in institutions
    ]


# ---------------------------------------------------------------------------
# GET /api/institutions/{id}/reputation
# ---------------------------------------------------------------------------

@router.get("/{institution_id}/reputation")
async def get_institution_reputation(
    institution_id: int,
    _current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the global and per-domain reputation scores for an institution.

    Requires: any authenticated user.
    """
    institution = await db.get(Institution, institution_id)
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")

    return {
        "institution_id": institution.id,
        "global_reputation_score": institution.reputation_score,
        "reputation_by_domain": institution.reputation_by_domain or {},
    }


# ---------------------------------------------------------------------------
# POST /api/institutions/apply — submit a registration application
# ---------------------------------------------------------------------------

class ApplicationRequest(BaseModel):
    institution_name: str
    institution_type: str  # "university" or "company"
    domains_of_expertise: List[str] = []
    contact_email: str
    contact_phone: Optional[str] = None
    description: Optional[str] = None


@router.post("/apply")
async def apply_for_institution(
    body: ApplicationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a university/institution registration application.

    Any authenticated user can apply. The application lands in the
    government officer's review queue. The institution is NOT yet usable
    until a government officer explicitly approves it.

    Requires: any authenticated user.
    """
    # Validate institution type
    if body.institution_type not in ("university", "company"):
        raise HTTPException(
            status_code=400,
            detail="institution_type must be 'university' or 'company'.",
        )

    # Prevent duplicate pending applications by the same user
    existing = await db.execute(
        select(InstitutionApplication).where(
            InstitutionApplication.applicant_id == current_user.id,
            InstitutionApplication.status == ApplicationStatus.pending,
        )
    )
    if existing.scalars().first():
        raise HTTPException(
            status_code=409,
            detail="You already have a pending application. Please wait for the government officer to review it.",
        )

    application = InstitutionApplication(
        applicant_id=current_user.id,
        institution_name=body.institution_name,
        institution_type=body.institution_type,
        domains_of_expertise=body.domains_of_expertise,
        contact_email=body.contact_email,
        contact_phone=body.contact_phone,
        description=body.description,
        status=ApplicationStatus.pending,
    )
    db.add(application)
    await db.commit()
    await db.refresh(application)

    return {
        "status": "submitted",
        "application_id": application.id,
        "message": (
            "Your institution registration application has been submitted. "
            "A government officer will review it shortly."
        ),
    }


# ---------------------------------------------------------------------------
# GET /api/institutions/applications — govt officer sees all applications
# ---------------------------------------------------------------------------

@router.get("/applications")
async def list_applications(
    status_filter: Optional[str] = None,
    current_user: User = Depends(require_role([UserRole.government_officer])),
    db: AsyncSession = Depends(get_db),
):
    """List institution registration applications.

    Optional query param: ``?status_filter=pending|approved|rejected``

    Requires: ``government_officer``.
    """
    query = select(InstitutionApplication).options(
        selectinload(InstitutionApplication.applicant)
    )

    if status_filter:
        try:
            status_enum = ApplicationStatus(status_filter)
            query = query.where(InstitutionApplication.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="status_filter must be 'pending', 'approved', or 'rejected'.",
            )

    query = query.order_by(InstitutionApplication.created_at.desc())
    result = await db.execute(query)
    applications = result.scalars().all()

    return [
        {
            "id": a.id,
            "institution_name": a.institution_name,
            "institution_type": a.institution_type,
            "domains_of_expertise": a.domains_of_expertise,
            "contact_email": a.contact_email,
            "contact_phone": a.contact_phone,
            "description": a.description,
            "status": a.status,
            "review_notes": a.review_notes,
            "created_institution_id": a.created_institution_id,
            "created_at": a.created_at,
            "reviewed_at": a.reviewed_at,
            "applicant": {
                "id": a.applicant.id,
                "name": a.applicant.name,
                "email": a.applicant.email,
                "role": a.applicant.role,
            },
        }
        for a in applications
    ]


# ---------------------------------------------------------------------------
# POST /api/institutions/applications/{id}/approve — govt officer approves
# ---------------------------------------------------------------------------

class ApproveRequest(BaseModel):
    review_notes: Optional[str] = None


@router.post("/applications/{application_id}/approve")
async def approve_application(
    application_id: int,
    body: ApproveRequest = ApproveRequest(),
    current_user: User = Depends(require_role([UserRole.government_officer])),
    db: AsyncSession = Depends(get_db),
):
    """Approve a university registration application.

    On approval:
    1. Creates the Institution record permanently in the database.
    2. Assigns the applicant the ``university_admin`` role and links them
       to the new institution.
    3. Marks the application as approved.

    The institution permanently sits in the database and can now receive
    tickets routed by the government officer.

    Requires: ``government_officer``.
    """
    application = await db.get(
        InstitutionApplication,
        application_id,
        options=[selectinload(InstitutionApplication.applicant)],
    )
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.status != ApplicationStatus.pending:
        raise HTTPException(
            status_code=400,
            detail=f"Application is already {application.status.value}.",
        )

    # 1. Create the Institution record
    institution = Institution(
        name=application.institution_name,
        type=InstitutionType(application.institution_type),
        domains_of_expertise=application.domains_of_expertise,
    )
    db.add(institution)
    await db.flush()  # populate institution.id

    # 2. Promote the applicant to university_admin and link institution
    applicant = await db.get(User, application.applicant_id)
    if applicant:
        applicant.role = UserRole.university_admin
        applicant.institution_id = institution.id

    # 3. Update application record
    application.status = ApplicationStatus.approved
    application.review_notes = body.review_notes
    application.created_institution_id = institution.id
    application.reviewed_at = datetime.now(timezone.utc)

    await db.commit()

    return {
        "status": "approved",
        "institution_id": institution.id,
        "institution_name": institution.name,
        "message": (
            f"Institution '{institution.name}' has been registered. "
            f"The applicant has been granted the university_admin role."
        ),
    }


# ---------------------------------------------------------------------------
# POST /api/institutions/applications/{id}/reject — govt officer rejects
# ---------------------------------------------------------------------------

class RejectRequest(BaseModel):
    review_notes: Optional[str] = None


@router.post("/applications/{application_id}/reject")
async def reject_application(
    application_id: int,
    body: RejectRequest = RejectRequest(),
    current_user: User = Depends(require_role([UserRole.government_officer])),
    db: AsyncSession = Depends(get_db),
):
    """Reject a university registration application.

    Requires: ``government_officer``.
    """
    application = await db.get(InstitutionApplication, application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.status != ApplicationStatus.pending:
        raise HTTPException(
            status_code=400,
            detail=f"Application is already {application.status.value}.",
        )

    application.status = ApplicationStatus.rejected
    application.review_notes = body.review_notes
    application.reviewed_at = datetime.now(timezone.utc)
    await db.commit()

    return {
        "status": "rejected",
        "application_id": application_id,
        "message": "Application has been rejected.",
    }
