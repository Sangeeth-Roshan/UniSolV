from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from pydantic import BaseModel

from app.core.database import get_db
from app.models.attribution import Attribution
from app.models.enums import IPOutcome

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
async def get_attributions(ticket_id: int = Query(...), db: AsyncSession = Depends(get_db)):
    """Fetch attribution records for a ticket to display lineage."""
    query = select(Attribution).where(Attribution.ticket_id == ticket_id)
    result = await db.execute(query)
    return result.scalars().all()
