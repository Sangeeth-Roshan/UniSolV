from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.institution import Institution

router = APIRouter()

@router.get("/{institution_id}/reputation")
async def get_institution_reputation(institution_id: int, db: AsyncSession = Depends(get_db)):
    """Returns the current global and per-domain reputation scores."""
    institution = await db.get(Institution, institution_id)
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
        
    return {
        "institution_id": institution.id,
        "global_reputation_score": institution.reputation_score,
        "reputation_by_domain": institution.reputation_by_domain or {}
    }
