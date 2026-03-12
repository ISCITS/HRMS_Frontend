from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class clsSettings(BaseSettings):
    # All runtime configuration enters the application here from `.env`.
    # Every other layer reads feature flags and connection details through this object.
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    APP_NAME: str = "HRMS Backend"
    APP_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    DEBUG_MODE: bool = False
    LOG_LEVEL: str = "INFO"

    ENABLE_SSO: bool = False
    ENABLE_REDIS: bool = False
    ENABLE_RATE_LIMIT: bool = False
    ENABLE_AUTH_MIDDLEWARE: bool = True
    ENABLE_REQUEST_LOGGING: bool = True
    ENABLE_CORS: bool = True
    ENABLE_SWAGGER: bool = True
    ENABLE_CSRF_PROTECTION: bool = True
    ENABLE_PAYLOAD_ENCRYPTION: bool = True

    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: int = 5432
    DATABASE_USER: str = "postgres"
    DATABASE_PASSWORD: str = "postgres"
    DATABASE_NAME: str = "postgres"
    DATABASE_URL: Optional[str] = None
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_POOL_RECYCLE: int = 1800

    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None
    REDIS_URL: Optional[str] = None
    REDIS_MAX_CONNECTIONS: int = 20

    AZURE_TENANT_ID: Optional[str] = None
    AZURE_CLIENT_ID: Optional[str] = None
    AZURE_ISSUER: Optional[str] = None
    AZURE_JWKS_URL: Optional[str] = None

    CORS_ALLOW_ORIGINS: str = "*"
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: str = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    CORS_ALLOW_HEADERS: str = "*"
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    HRMS_CSRF_SECRET_KEY: str = "zE8nLiA0tePsr686Jp6idRKhjpOfH0rPuYcVoJyPUUn="
    SESSION_TIMEOUT_MINUTES: int = 60

    @property
    def strDatabaseUrl(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            f"postgresql+psycopg://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}"
            f"@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"
        )

    @property
    def strRedisUrl(self) -> str:
        if self.REDIS_URL:
            return self.REDIS_URL
        strPasswordSegment = f":{self.REDIS_PASSWORD}@" if self.REDIS_PASSWORD else ""
        return f"redis://{strPasswordSegment}{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    @property
    def lstCorsAllowOrigins(self) -> list[str]:
        return [strOrigin.strip() for strOrigin in self.CORS_ALLOW_ORIGINS.split(",") if strOrigin.strip()]

    @property
    def lstCorsAllowMethods(self) -> list[str]:
        return [strMethod.strip() for strMethod in self.CORS_ALLOW_METHODS.split(",") if strMethod.strip()]

    @property
    def lstCorsAllowHeaders(self) -> list[str]:
        return [strHeader.strip() for strHeader in self.CORS_ALLOW_HEADERS.split(",") if strHeader.strip()]

    @property
    def boolAuthenticationEnabled(self) -> bool:
        return self.ENABLE_SSO and self.ENABLE_AUTH_MIDDLEWARE

    @property
    def lstAllowedOrigins(self) -> list[str]:
        return [strOrigin.strip() for strOrigin in self.ALLOWED_ORIGINS.split(",") if strOrigin.strip()]


@lru_cache(maxsize=1)
def getSettings() -> clsSettings:
    # The settings object is cached so every layer reads a single normalized config snapshot.
    return clsSettings()
