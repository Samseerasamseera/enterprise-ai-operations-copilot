import pytest
from httpx import ASGITransport, AsyncClient
from uuid import uuid4

from app.main import app


@pytest.mark.asyncio
async def test_user_cannot_access_another_tenant():
    """A user must not access a tenant without membership."""
    transport = ASGITransport(app=app)
    email = f"isolation_{uuid4().hex}@example.com"
    password = "TestPassword@2026!"

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        # Find an existing tenant so the user can register.
        from sqlalchemy import select
        from app.db.session import AsyncSessionLocal
        from app.models.tenant import Tenant

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Tenant).limit(1))
            existing_tenant = result.scalar_one_or_none()

        assert existing_tenant is not None, (
            "Create a development tenant before running this test."
        )

        # Register and log in the test user.
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

        # Create a different tenant using another authenticated user.
        other_email = f"other_{uuid4().hex}@example.com"

        other_register = await client.post(
            "/auth/register",
            json={
                "email": other_email,
                "password": password,
                "tenant_id": existing_tenant.id,
            },
        )
        assert other_register.status_code == 201, other_register.text

        other_login = await client.post(
            "/auth/login",
            json={"email": other_email, "password": password},
        )
        assert other_login.status_code == 200, other_login.text

        other_token = other_login.json()["access_token"]
        client.headers["Authorization"] = f"Bearer {other_token}"

        create_response = await client.post(
            "/tenants",
            json={"name": f"Private Tenant {uuid4().hex}"},
        )
        assert create_response.status_code == 201, create_response.text
        private_tenant_id = create_response.json()["id"]

        # Switch back to the original user.
        client.headers["Authorization"] = f"Bearer {token}"

        response = await client.get(f"/tenants/{private_tenant_id}")

        assert response.status_code == 403, response.text
