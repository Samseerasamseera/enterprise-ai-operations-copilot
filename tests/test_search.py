
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


async def create_user_and_tenant(client: AsyncClient) -> tuple[str, str]:
    email = f"search_{uuid4().hex}@example.com"
    password = "TestPassword@2026!"

    register = await client.post(
        "/auth/register",
        json={"email": email, "password": password},
    )
    assert register.status_code == 201, register.text

    login = await client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert login.status_code == 200, login.text

    token = login.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"

    tenant = await client.post(
        "/tenants",
        json={"name": f"Search Test {uuid4().hex}"},
    )
    assert tenant.status_code == 201, tenant.text

    return token, tenant.json()["id"]


@pytest.mark.asyncio
async def test_search_returns_results(monkeypatch):
    from app.api.routes import search as search_route

    expected_results = [
        {
            "chunk_id": "doc-1:0",
            "content": "FastAPI serves the copilot API.",
            "document_id": "doc-1",
            "chunk_index": 0,
            "distance": 0.1,
        }
    ]

    monkeypatch.setattr(
        search_route,
        "search_chunks",
        lambda **kwargs: expected_results,
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        _, tenant_id = await create_user_and_tenant(client)

        response = await client.post(
            f"/tenants/{tenant_id}/search",
            json={"query": "FastAPI", "top_k": 3},
        )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["query"] == "FastAPI"
    assert data["result_count"] == 1
    assert data["results"][0]["content"] == expected_results[0]["content"]


@pytest.mark.asyncio
async def test_search_rejects_short_query():
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        _, tenant_id = await create_user_and_tenant(client)

        response = await client.post(
            f"/tenants/{tenant_id}/search",
            json={"query": "x"},
        )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_search_rejects_user_without_tenant_access():
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        first_token, _ = await create_user_and_tenant(client)
        _, other_tenant_id = await create_user_and_tenant(client)

        client.headers["Authorization"] = f"Bearer {first_token}"

        response = await client.post(
            f"/tenants/{other_tenant_id}/search",
            json={"query": "private information"},
        )

    assert response.status_code == 403, response.text
