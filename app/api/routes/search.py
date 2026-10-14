
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.tenant_deps import get_current_tenant_membership
from app.models.membership import Membership
from app.services.vector_store import search_chunks

router = APIRouter(
    prefix="/tenants/{tenant_id}/search",
    tags=["Semantic Search"],
)


class SearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=2000)
    top_k: int = Field(default=5, ge=1, le=10)


@router.post("")
async def search_documents(
    payload: SearchRequest,
    membership: Annotated[
        Membership, Depends(get_current_tenant_membership)
    ],
    tenant_id: str,
):
    del membership

    try:
        results = search_chunks(
            tenant_id=tenant_id,
            query=payload.query,
            top_k=payload.top_k,
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Document search failed.",
        ) from None

    return {
        "query": payload.query,
        "results": results,
        "result_count": len(results),
    }
