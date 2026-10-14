from app.api.deps import get_current_user
import logging
import uuid
from pathlib import Path
from typing import Annotated
from app.services.vector_store import index_chunks

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.tenant_deps import get_current_tenant_membership
from app.db.session import get_db
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.membership import Membership
from app.models.user import User
from app.services.document_processor import (
    MAX_FILE_SIZE,
    extract_text,
    split_text,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/tenants/{tenant_id}/documents",
    tags=["Documents"],
)

ALLOWED_EXTENSIONS = {".pdf", ".txt"}


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    tenant_id: str,
    file: Annotated[UploadFile, File(...)],
    membership: Annotated[
        Membership, Depends(get_current_tenant_membership)
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    del membership  # Dependency verifies tenant membership.

    filename = Path(file.filename or "").name
    suffix = Path(filename).suffix.lower()

    if not filename or suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and TXT files are supported.",
        )

    content = await file.read(MAX_FILE_SIZE + 1)
    await file.close()

    if not content:
        raise HTTPException(status_code=400, detail="The file is empty.")

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Maximum file size is 10 MB.",
        )

    try:
        text = extract_text(filename, content)
        chunks = split_text(text)
    except (ValueError, UnicodeDecodeError):
        raise HTTPException(
            status_code=400,
            detail="The file could not be processed. Check its format and contents.",
        ) from None
    except Exception:
        logger.exception("Document extraction failed")
        raise HTTPException(
            status_code=400,
            detail="Unable to read this document.",
        ) from None

    
    storage_root = Path("storage") / "documents" / tenant_id
    storage_root.mkdir(parents=True, exist_ok=True)

    document_id = str(uuid.uuid4())
    safe_filename = f"{document_id}{suffix}"
    file_path = storage_root / safe_filename

    document = Document(
        id=document_id,
        tenant_id=tenant_id,
        uploaded_by=current_user.id,
        filename=filename,
        content_type=file.content_type or "application/octet-stream",
        file_path=str(file_path),
        status="processed",
    )

   
    try:
        file_path.write_bytes(content)
        db.add(document)

        for index, chunk in enumerate(chunks):
            db.add(
                DocumentChunk(
                    document_id=document_id,
                    tenant_id=tenant_id,
                    chunk_index=index,
                    content=chunk,
                )
            )

        await db.commit()

        index_chunks(
            document_id=document_id,
            tenant_id=tenant_id,
            chunks=chunks,
        )

    except Exception:
        await db.rollback()
        file_path.unlink(missing_ok=True)
        logger.exception("Document persistence or indexing failed")
        raise HTTPException(
            status_code=500,
            detail="Could not save or index the document.",
        ) from None


    return {
        "document_id": document_id,
        "filename": filename,
        "status": "processed",
        "chunk_count": len(chunks),
        "message": "Document uploaded and split into searchable chunks.",
    }
