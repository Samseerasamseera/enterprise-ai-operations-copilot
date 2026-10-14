
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.tenant_deps import get_current_tenant_membership
from app.db.session import get_db
from app.models.ai_query import AIQuery
from app.models.membership import Membership
from app.services.rag_service import answer_question

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/tenants/{tenant_id}/qa",
    tags=["RAG Question Answering"],
)


class QuestionRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    top_k: int = Field(default=5, ge=1, le=10)


@router.post("/ask")
async def ask_question(
    payload: QuestionRequest,
    tenant_id: str,
    membership: Annotated[
        Membership,
        Depends(get_current_tenant_membership),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        result = await answer_question(
            tenant_id=tenant_id,
            question=payload.question,
            top_k=payload.top_k,
        )

        query_record = AIQuery(
            tenant_id=tenant_id,
            user_id=membership.user_id,
            question=payload.question,
        )
        db.add(query_record)
        await db.commit()

        return {
            "tenant_id": tenant_id,
            "question": payload.question,
            **result,
        }

    except RuntimeError as exc:
        await db.rollback()
        logger.exception("RAG configuration error")
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from None

    except Exception:
        await db.rollback()
        logger.exception("RAG question answering failed")
        raise HTTPException(
            status_code=502,
            detail=(
                "Unable to generate an answer right now. "
                "Check the server terminal for details."
            ),
        ) from None
