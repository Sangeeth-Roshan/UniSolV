"""API routers package."""
from fastapi import APIRouter

from app.api.health import router as health_router
from app.api.admin import router as admin_router
from app.api.tickets import router as tickets_router
from app.api.institutions import router as institutions_router
from app.api.attributions import router as attributions_router
from app.api.auth import router as auth_router
from app.api.analytics import router as analytics_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router, prefix="/api/auth", tags=["auth"])
api_router.include_router(admin_router, prefix="/api")
api_router.include_router(tickets_router, prefix="/api/tickets", tags=["tickets"])
api_router.include_router(institutions_router, prefix="/api/institutions", tags=["institutions"])
api_router.include_router(attributions_router, prefix="/api/attributions", tags=["attributions"])
api_router.include_router(analytics_router, prefix="/api/analytics", tags=["analytics"])
