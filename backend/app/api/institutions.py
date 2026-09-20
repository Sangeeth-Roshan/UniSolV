from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.institution import Institution
from app.models.user import User

router = APIRouter()


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
