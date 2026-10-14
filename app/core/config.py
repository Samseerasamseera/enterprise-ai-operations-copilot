from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Enterprise AI Operations Copilot"
    environment: str = "development"
    groq_api_key: str = ""
    mcp_tenant_id: str = ""
    debug: bool = True

    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/enterprise_ai"
    )

    model_timeout_seconds: int = 30
    jwt_secret_key: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
      
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()