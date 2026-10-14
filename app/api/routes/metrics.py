
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.tenant_deps import get_current_tenant_membership
from app.db.session import get_db
from app.models.ai_query import AIQuery
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.membership import Membership

router = APIRouter(
    prefix="/tenants/{tenant_id}/metrics",
    tags=["Dashboard Metrics"],
)


@router.get("")
async def get_dashboard_metrics(
    tenant_id: str,
    membership: Annotated[
        Membership,
        Depends(get_current_tenant_membership),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    del membership

    documents_result = await db.execute(
        select(func.count())
        .select_from(Document)
        .where(
            Document.tenant_id == tenant_id,
            Document.status == "processed",
        )
    )

    chunks_result = await db.execute(
        select(func.count())
        .select_from(DocumentChunk)
        .where(DocumentChunk.tenant_id == tenant_id)
    )

    queries_result = await db.execute(
        select(func.count())
        .select_from(AIQuery)
        .where(AIQuery.tenant_id == tenant_id)
    )

    return {
        "documents_indexed": documents_result.scalar_one(),
        "knowledge_chunks": chunks_result.scalar_one(),
        "ai_queries": queries_result.scalar_one(),
    }
