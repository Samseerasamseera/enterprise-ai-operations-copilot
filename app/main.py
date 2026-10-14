from fastapi import FastAPI
from app.api.routes.tenants import router as tenants_router
from app.api.routes.health import router as health_router
from app.core.config import get_settings
from app.api.routes.auth import router as auth_router
from app.api.routes.documents import router as documents_router
from app.api.routes.search import router as search_router
from app.api.routes.qa import router as qa_router
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import metrics

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Production-grade enterprise AI platform",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(tenants_router)
app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(search_router)
app.include_router(qa_router)
app.include_router(metrics.router)





@app.get("/")
async def root():
    return {
        "service": settings.app_name,
        "version": "0.1.0",
        "status": "running",
    }