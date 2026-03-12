from fastapi import Depends
from sqlalchemy.orm import Session

from app.cache.RedisClient import clsRedisClient
from app.core.Config import clsSettings, getSettings
from app.core.Security import clsTokenValidator
from app.database.SessionManager import getDbSession
from app.repositories.UserRepository import clsUserRepository
from app.services.AuthService import clsAuthService
from app.services.UserService import clsUserService


def getTokenValidator(objSettings: clsSettings = Depends(getSettings)) -> clsTokenValidator:
    # Configuration flows into the token validator so auth behavior stays centralized.
    return clsTokenValidator(objSettings)


def getRedisClient(objSettings: clsSettings = Depends(getSettings)) -> clsRedisClient:
    # Feature flags decide whether this is a live Redis client or a no-op wrapper.
    return clsRedisClient(objSettings)


def getUserRepository(objSession: Session = Depends(getDbSession)) -> clsUserRepository:
    # A request-scoped database session flows into the repository through dependency injection.
    return clsUserRepository(objSession)


def getUserService(
    objRepository: clsUserRepository = Depends(getUserRepository),
    objRedisClient: clsRedisClient = Depends(getRedisClient),
) -> clsUserService:
    # Routers depend on services, and services compose repository and cache dependencies here.
    return clsUserService(objRepository, objRedisClient)


def getAuthService(objTokenValidator: clsTokenValidator = Depends(getTokenValidator)) -> clsAuthService:
    # Middleware and auth routes use this service entry point for token validation logic.
    return clsAuthService(objTokenValidator)
