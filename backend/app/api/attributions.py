from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from pydantic import BaseModel

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.attribution import Attribution
from app.models.ticket import Ticket
from app.models.enums import IPOutcome, UserRole
from app.models.user import User

router = APIRouter()


class AttributionResponse(BaseModel):
    id: int
    ticket_id: int
    reporter_id: int
    institution_id: int
    industry_partner_id: Optional[int]
    ip_outcome: Optional[IPOutcome]
    notes: Optional[str]

    class Config:
        from_attributes = True


@router.get("", response_model=List[AttributionResponse])
async def get_attributions(
    ticket_id: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch attribution records for a ticket to display its lineage.

    Access control:
    * citizens        — only for their own reported tickets
    * institution roles — only for tickets assigned to their institution
    * government_officer — all tickets
    """
    # First, verify the ticket exists and the caller is allowed to see it
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if current_user.role == UserRole.citizen:
        if ticket.reporter_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role in (UserRole.university_admin, UserRole.student, UserRole.company):
        if not current_user.institution_id:
            raise HTTPException(status_code=403, detail="Your institution account is pending approval")
        if ticket.assigned_institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Not authorized")
    # government_officer — no restriction

    query = select(Attribution).where(Attribution.ticket_id == ticket_id)
    result = await db.execute(query)
    return result.scalars().all()
