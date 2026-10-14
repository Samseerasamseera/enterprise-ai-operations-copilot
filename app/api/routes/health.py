from fastapi import APIRouter

from app.services.health_service import get_health_status


router = APIRouter(
    prefix="/health",
    tags=["Health"],
)


@router.get(
    "",
    response_model=None,
    summary="Health check",
)
async def health_check():
    return get_health_status()