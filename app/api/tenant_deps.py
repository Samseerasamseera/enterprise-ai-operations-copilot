
from typing import Annotated

from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.membership import Membership
from app.models.user import User


async def get_current_tenant_membership(
    tenant_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Membership:
    result = await db.execute(
        select(Membership).where(
            Membership.user_id == current_user.id,
            Membership.tenant_id == tenant_id,
        )
    )

    membership = result.scalar_one_or_none()

    if membership is None:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this tenant.",
        )

    return membership
