"""
Admin API endpoints.

POST /api/admin/classifier-mode
    Flip the active classifier mode at runtime (no restart needed).
    Useful for live demos.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator

from app.ml.classification_providers import (
    get_current_mode,
    set_classifier_mode,
)

router = APIRouter(prefix="/admin", tags=["admin"])


class ClassifierModeRequest(BaseModel):
    mode: str

    @field_validator("mode")
    @classmethod
    def validate_mode(cls, v: str) -> str:
        v = v.lower()
        if v not in {"cached", "live"}:
            raise ValueError("mode must be 'cached' or 'live'")
        return v


class ClassifierModeResponse(BaseModel):
    previous_mode: str
    current_mode: str
    message: str


@router.post(
    "/classifier-mode",
    response_model=ClassifierModeResponse,
    summary="Flip the active classifier mode at runtime",
    description=(
        "Switches the classifier between **cached** (nearest-neighbour on "
        "the synthetic dataset) and **live** (real LLM API call). "
        "The change takes effect immediately in-memory — no restart needed."
    ),
)
def set_mode(body: ClassifierModeRequest) -> ClassifierModeResponse:
    previous = get_current_mode()
    try:
        set_classifier_mode(body.mode)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return ClassifierModeResponse(
        previous_mode=previous,
        current_mode=get_current_mode(),
        message=f"Classifier mode switched from '{previous}' to '{body.mode}'.",
    )


@router.get(
    "/classifier-mode",
    summary="Get the currently active classifier mode",
)
def get_mode() -> dict[str, str]:
    return {"mode": get_current_mode()}
