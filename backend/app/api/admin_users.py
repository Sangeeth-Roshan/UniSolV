"""
Super-admin user management endpoints.

All routes require a valid super-admin JWT obtained via POST /api/super-admin/login.
Super-admin credentials are configured via SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD env vars.
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.enums import UserRole
from app.models.user import User

router = APIRouter(prefix="/super-admin", tags=["super-admin"])

# ── Super-admin OAuth2 scheme (separate token URL) ────────────────────────────
_super_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/super-admin/login", auto_error=True)

SUPER_ADMIN_TOKEN_EXPIRE_HOURS = 12
_SUPER_ADMIN_ALGORITHM = "HS256"
_SUPER_ADMIN_AUDIENCE = "unisolv-super-admin"


def _get_super_admin_credentials() -> tuple[str, str]:
    """Return (email, password) from env / settings with sane defaults for dev."""
    email = getattr(settings, "SUPER_ADMIN_EMAIL", "superadmin@unisolv.internal")
    password = getattr(settings, "SUPER_ADMIN_PASSWORD", "SuperAdmin@2026!")
    return email, password


def _create_super_admin_token() -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=SUPER_ADMIN_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": "super-admin",
        "aud": _SUPER_ADMIN_AUDIENCE,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=_SUPER_ADMIN_ALGORITHM)


def _verify_super_admin_token(token: str = Depends(_super_oauth2)) -> None:
    try:
        jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[_SUPER_ADMIN_ALGORITHM],
            audience=_SUPER_ADMIN_AUDIENCE,
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired super-admin token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# Shorthand dependency
_SuperAdmin = Depends(_verify_super_admin_token)


# ── Schemas ────────────────────────────────────────────────────────────────────

class SuperAdminLoginRequest(BaseModel):
    email: str
    password: str


class SuperAdminToken(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    phone: Optional[str]
    institution_id: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class UserCreateRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.citizen
    phone: Optional[str] = None
    institution_id: Optional[int] = None


class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    phone: Optional[str] = None
    institution_id: Optional[int] = None


class PaginatedUsers(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    users: list[UserOut]


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=SuperAdminToken, summary="Super-admin login")
async def super_admin_login(body: SuperAdminLoginRequest):
    """
    Authenticate with the super-admin credential.
    Returns a JWT valid for 12 hours.
    """
    sa_email, sa_password = _get_super_admin_credentials()
    if body.email != sa_email or body.password != sa_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid super-admin credentials",
        )
    return SuperAdminToken(access_token=_create_super_admin_token())


@router.get("/users", response_model=PaginatedUsers, summary="List / search users")
async def list_users(
    _: None = _SuperAdmin,
    db: AsyncSession = Depends(get_db),
    search: str = Query("", description="Search name or email (case-insensitive)"),
    role: Optional[UserRole] = Query(None, description="Filter by role"),
    sort_by: str = Query("created_at", description="Column to sort: id | name | email | role | created_at"),
    sort_order: str = Query("desc", description="asc | desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    allowed_sort_cols = {"id", "name", "email", "role", "created_at"}
    if sort_by not in allowed_sort_cols:
        sort_by = "created_at"

    col = getattr(User, sort_by)
    order_expr = col.asc() if sort_order == "asc" else col.desc()

    filters = []
    if search:
        pattern = f"%{search}%"
        filters.append(or_(User.name.ilike(pattern), User.email.ilike(pattern)))
    if role:
        filters.append(User.role == role)

    count_q = select(func.count()).select_from(User)
    main_q = select(User).order_by(order_expr)
    if filters:
        count_q = count_q.where(*filters)
        main_q = main_q.where(*filters)

    total = (await db.execute(count_q)).scalar_one()
    offset = (page - 1) * page_size
    rows = (await db.execute(main_q.offset(offset).limit(page_size))).scalars().all()

    return PaginatedUsers(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 1,
        users=[UserOut.model_validate(u) for u in rows],
    )


@router.post("/users", response_model=UserOut, status_code=201, summary="Create a user")
async def create_user(
    body: UserCreateRequest,
    _: None = _SuperAdmin,
    db: AsyncSession = Depends(get_db),
):
    existing = (await db.execute(select(User).where(User.email == body.email))).scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=body.name,
        email=body.email,
        password_hash=get_password_hash(body.password),
        role=body.role,
        phone=body.phone,
        institution_id=body.institution_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.get("/users/{user_id}", response_model=UserOut, summary="Get a user by ID")
async def get_user(
    user_id: int,
    _: None = _SuperAdmin,
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserOut, summary="Update a user")
async def update_user(
    user_id: int,
    body: UserUpdateRequest,
    _: None = _SuperAdmin,
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.name is not None:
        user.name = body.name
    if body.email is not None:
        clash = (await db.execute(
            select(User).where(User.email == body.email, User.id != user_id)
        )).scalars().first()
        if clash:
            raise HTTPException(status_code=400, detail="Email already in use by another user")
        user.email = body.email
    if body.password is not None:
        user.password_hash = get_password_hash(body.password)
    if body.role is not None:
        user.role = body.role
    if body.phone is not None:
        user.phone = body.phone
    if body.institution_id is not None:
        user.institution_id = body.institution_id

    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.delete("/users/{user_id}", status_code=204, summary="Delete a user")
async def delete_user(
    user_id: int,
    _: None = _SuperAdmin,
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()
