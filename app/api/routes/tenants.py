
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.tenant_deps import get_current_tenant_membership
from app.db.session import get_db
from app.models.membership import Membership
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.tenant import TenantCreate, TenantResponse

router = APIRouter(prefix="/tenants", tags=["Tenants"])


@router.post(
    "",
    response_model=TenantResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_tenant(
    payload: TenantCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    name = payload.name.strip()

    if len(name) < 2:
        raise HTTPException(status_code=422, detail="Tenant name is too short.")

    existing = await db.execute(
        select(Tenant).where(Tenant.name == name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="A tenant with this name already exists.",
        )

    tenant = Tenant(name=name)
    db.add(tenant)

    try:
        await db.flush()
        db.add(
            Membership(
                user_id=current_user.id,
                tenant_id=tenant.id,
                role="admin",
            )
        )
        await db.commit()
        await db.refresh(tenant)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Could not create tenant because of a conflict.",
        ) from None

    return tenant


@router.get("", response_model=list[TenantResponse])
async def list_tenants(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Tenant)
        .join(Membership, Membership.tenant_id == Tenant.id)
        .where(Membership.user_id == current_user.id)
        .order_by(Tenant.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: str,
    membership: Annotated[
        Membership, Depends(get_current_tenant_membership)
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    del membership

    result = await db.execute(
        select(Tenant).where(Tenant.id == tenant_id)
    )
    tenant = result.scalar_one_or_none()

    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found.")

    return tenant
