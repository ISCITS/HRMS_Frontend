import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.cache.RedisClient import clsRedisClient

from app.api.Router import getApiRouter
from app.core.Config import getSettings
from app.core.LoggingConfig import configureLogging
from app.core.Security import clsTokenValidator
from app.database.SessionManager import verifyDatabaseConnection
from app.health.HealthRoutes import objRouter as objHealthRouter
from app.middleware.AuthMiddleware import clsAuthMiddleware
from app.middleware.RequestLoggerMiddleware import clsRequestLoggerMiddleware
from app.security.SecurityMiddleware import clsSecurityMiddleware
from app.security.SessionMiddleware import clsSessionMiddleware
from app.services.AuthService import clsAuthService
from app.utilities.ExceptionHelper import registerExceptionHandlers

objSettings = getSettings()
configureLogging(objSettings)
objLogger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(objApp: FastAPI):
    # Startup flow: load config -> configure logging -> verify infrastructure -> start serving requests.
    try:
        verifyDatabaseConnection()
    except Exception as objException:
        objLogger.exception("Database connectivity verification failed during startup: %s", str(objException))
    objLogger.info("Application startup completed.")
    yield
    

    await clsRedisClient.closeRedis()
    objLogger.info("Application shutdown completed.")


objApp = FastAPI(
    title=objSettings.APP_NAME,
    version=objSettings.APP_VERSION,
    debug=objSettings.DEBUG,
    docs_url="/docs" if objSettings.ENABLE_SWAGGER else None,
    redoc_url="/redoc" if objSettings.ENABLE_SWAGGER else None,
    openapi_url="/openapi.json" if objSettings.ENABLE_SWAGGER else None,
    lifespan=lifespan,
)

registerExceptionHandlers(objApp)

if objSettings.ENABLE_REQUEST_LOGGING:
    # Request logging wraps the request/response cycle for observability.
    objApp.add_middleware(clsRequestLoggerMiddleware)

# Middleware execution is reverse-ordered, so session middleware is added first
# to let security validation and decryption run before protected-route session checks.
objApp.add_middleware(clsSessionMiddleware, objSettings=objSettings)
objApp.add_middleware(clsSecurityMiddleware, objSettings=objSettings)

if objSettings.boolAuthenticationEnabled:
    # Authentication middleware is conditionally inserted based on feature flags.
    objApp.add_middleware(clsAuthMiddleware, objAuthService=clsAuthService(clsTokenValidator(objSettings)))

if objSettings.ENABLE_CORS:
    # CORS is added last so it becomes the outermost middleware and attaches headers even to error responses.
    objApp.add_middleware(
        CORSMiddleware,
        allow_origins=objSettings.lstCorsAllowOrigins or ["*"],
        allow_credentials=objSettings.CORS_ALLOW_CREDENTIALS,
        allow_methods=objSettings.lstCorsAllowMethods or ["*"],
        allow_headers=objSettings.lstCorsAllowHeaders or ["*"],
    )

# Final assembly flow: middleware -> versioned API routers -> health router.
objApp.include_router(getApiRouter(objSettings))
objApp.include_router(objHealthRouter)

app = objApp
