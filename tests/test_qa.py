
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


async def create_user_and_tenant(client: AsyncClient) -> tuple[str, str]:
    email = f"qa_{uuid4().hex}@example.com"
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
        json={"name": f"QA Test {uuid4().hex}"},
    )
    assert tenant.status_code == 201, tenant.text

    return token, tenant.json()["id"]


@pytest.mark.asyncio
async def test_qa_returns_answer_and_sources(monkeypatch):
    from app.api.routes import qa as qa_route

    async def fake_answer_question(**kwargs):
        return {
            "answer": "The project uses FastAPI [Source 1].",
            "sources": [
                {
                    "source": "Source 1",
                    "document_id": "doc-123",
                    "chunk_index": 0,
                }
            ],
        }

    monkeypatch.setattr(qa_route, "answer_question", fake_answer_question)

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        _, tenant_id = await create_user_and_tenant(client)

        response = await client.post(
            f"/tenants/{tenant_id}/qa/ask",
            json={"question": "Which API framework is used?"},
        )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["tenant_id"] == tenant_id
    assert "FastAPI" in data["answer"]
    assert data["sources"][0]["source"] == "Source 1"


@pytest.mark.asyncio
async def test_qa_returns_fallback_when_no_sources(monkeypatch):
    from app.api.routes import qa as qa_route

    async def fake_answer_question(**kwargs):
        return {
            "answer": "I couldn't find relevant information in the uploaded documents.",
            "sources": [],
        }

    monkeypatch.setattr(qa_route, "answer_question", fake_answer_question)

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        _, tenant_id = await create_user_and_tenant(client)

        response = await client.post(
            f"/tenants/{tenant_id}/qa/ask",
            json={"question": "What is in the documents?"},
        )

    assert response.status_code == 200, response.text
    assert response.json()["sources"] == []
    assert "couldn't find relevant information" in response.json()["answer"]


@pytest.mark.asyncio
async def test_qa_rejects_user_without_tenant_access(monkeypatch):
    from app.api.routes import qa as qa_route

    async def unexpected_answer_question(**kwargs):
        pytest.fail("RAG should not run for an unauthorized tenant.")

    monkeypatch.setattr(
        qa_route,
        "answer_question",
        unexpected_answer_question,
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        first_token, _ = await create_user_and_tenant(client)
        _, other_tenant_id = await create_user_and_tenant(client)

        client.headers["Authorization"] = f"Bearer {first_token}"

        response = await client.post(
            f"/tenants/{other_tenant_id}/qa/ask",
            json={"question": "Show me the private documents"},
        )

    assert response.status_code == 403, response.text


@pytest.mark.asyncio
async def test_qa_handles_llm_failure(monkeypatch):
    from app.api.routes import qa as qa_route

    async def failing_answer_question(**kwargs):
        raise RuntimeError("LLM configuration unavailable")

    monkeypatch.setattr(
        qa_route,
        "answer_question",
        failing_answer_question,
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        _, tenant_id = await create_user_and_tenant(client)

        response = await client.post(
            f"/tenants/{tenant_id}/qa/ask",
            json={"question": "Explain the copilot"},
        )

    assert response.status_code == 503
    assert response.json()["detail"] == "LLM configuration unavailable"
