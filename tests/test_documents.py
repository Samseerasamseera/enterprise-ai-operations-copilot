
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


async def create_user_and_tenant(client: AsyncClient) -> tuple[str, str]:
    """Register a user, log in, and create a tenant."""
    email = f"documents_{uuid4().hex}@example.com"
    password = "TestPassword@2026!"

    register_response = await client.post(
        "/auth/register",
        json={"email": email, "password": password},
    )
    assert register_response.status_code == 201, register_response.text

    login_response = await client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert login_response.status_code == 200, login_response.text

    token = login_response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"

    tenant_response = await client.post(
        "/tenants",
        json={"name": f"Document Test {uuid4().hex}"},
    )
    assert tenant_response.status_code == 201, tenant_response.text

    return token, tenant_response.json()["id"]


@pytest.mark.asyncio
async def test_upload_txt_document(monkeypatch):
    """A valid TXT document should be processed and indexed."""
    from app.api.routes import documents as documents_route

    # Isolate this test from the real ChromaDB index.
    monkeypatch.setattr(
        documents_route,
        "index_chunks",
        lambda **kwargs: None,
    )

    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        _, tenant_id = await create_user_and_tenant(client)

        content = (
            b"Enterprise AI Operations Copilot uses Python and FastAPI. "
            b"It supports document search and retrieval augmented generation."
        )

        response = await client.post(
            f"/tenants/{tenant_id}/documents/upload",
            files={"file": ("notes.txt", content, "text/plain")},
        )

        assert response.status_code == 201, response.text
        data = response.json()
        assert data["filename"] == "notes.txt"
        assert data["status"] == "processed"
        assert data["chunk_count"] >= 1
        assert data["document_id"]


@pytest.mark.asyncio
async def test_upload_rejects_unsupported_file_type():
    """Unsupported file extensions should be rejected."""
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        _, tenant_id = await create_user_and_tenant(client)

        response = await client.post(
            f"/tenants/{tenant_id}/documents/upload",
            files={"file": ("script.exe", b"not allowed", "application/octet-stream")},
        )

        assert response.status_code == 400
        assert "Only PDF and TXT" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_rejects_user_without_tenant_access():
    """A user cannot upload documents to another user's tenant."""
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        first_token, _ = await create_user_and_tenant(client)

        # Create a separate tenant under another user's account.
        _, other_tenant_id = await create_user_and_tenant(client)

        client.headers["Authorization"] = f"Bearer {first_token}"

        response = await client.post(
            f"/tenants/{other_tenant_id}/documents/upload",
            files={"file": ("notes.txt", b"private document", "text/plain")},
        )

        assert response.status_code == 403, response.text
