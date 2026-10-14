
import pytest
from httpx import ASGITransport, AsyncClient
from uuid import uuid4

from app.main import app


@pytest.mark.asyncio
async def test_create_and_list_tenant():
    transport = ASGITransport(app=app)
    email = f"test_{uuid4().hex}@example.com"
    password = "TestPassword@2026!"
    tenant_name = f"Test Tenant {uuid4().hex}"

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        # Register the user under the existing development tenant.
        from app.core.config import get_settings

        settings = get_settings()

        # Find a tenant ID already present in the database.
        # Use the existing development tenant for registration.
        from sqlalchemy import select
        from app.db.session import AsyncSessionLocal
        from app.models.tenant import Tenant

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Tenant).limit(1))
            existing_tenant = result.scalar_one_or_none()

        assert existing_tenant is not None, (
            "Create a development tenant before running these tests."
        )

        register_response = await client.post(
            "/auth/register",
            json={
                "email": email,
                "password": password,
                "tenant_id": existing_tenant.id,
            },
        )
        assert register_response.status_code == 201, register_response.text

        login_response = await client.post(
            "/auth/login",
            json={"email": email, "password": password},
        )
        assert login_response.status_code == 200, login_response.text
        token = login_response.json()["access_token"]
        client.headers["Authorization"] = f"Bearer {token}"

        create_response = await client.post(
            "/tenants",
            json={"name": tenant_name},
        )
        assert create_response.status_code == 201, create_response.text

        list_response = await client.get("/tenants")
        assert list_response.status_code == 200, list_response.text
        assert any(
            tenant["name"] == tenant_name
            for tenant in list_response.json()
        )


@pytest.mark.asyncio
async def test_duplicate_tenant_returns_conflict():
    transport = ASGITransport(app=app)
    email = f"test_{uuid4().hex}@example.com"
    password = "TestPassword@2026!"

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        from sqlalchemy import select
        from app.db.session import AsyncSessionLocal
        from app.models.tenant import Tenant

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Tenant).limit(1))
            existing_tenant = result.scalar_one_or_none()

        assert existing_tenant is not None

        register_response = await client.post(
            "/auth/register",
            json={
                "email": email,
                "password": password,
                "tenant_id": existing_tenant.id,
            },
        )
        assert register_response.status_code == 201, register_response.text

        login_response = await client.post(
            "/auth/login",
            json={"email": email, "password": password},
        )
        assert login_response.status_code == 200, login_response.text
        token = login_response.json()["access_token"]
        client.headers["Authorization"] = f"Bearer {token}"

        tenant_name = f"Duplicate Tenant {uuid4().hex}"

        first_response = await client.post(
            "/tenants",
            json={"name": tenant_name},
        )
        assert first_response.status_code == 201, first_response.text

        # Repeat the same tenant name.
        second_response = await client.post(
            "/tenants",
            json={"name": tenant_name},
        )
        assert second_response.status_code == 409, second_response.text
