from app.core.config import get_settings
from app.schemas.health import HealthResponse


def get_health_status() -> HealthResponse:
    settings = get_settings()

    return HealthResponse(
        status="healthy",
        service=settings.app_name,
        environment=settings.environment,
    )