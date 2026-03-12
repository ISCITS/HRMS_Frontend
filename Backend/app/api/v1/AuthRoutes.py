from fastapi import APIRouter, Depends

from app.core.DependencyContainer import getAuthService
from app.services.AuthService import clsAuthService
from app.utilities.ResponseHelper import buildResponse

objRouter = APIRouter(prefix="/auth", tags=["Authentication"])


@objRouter.get("/me")
def getCurrentTokenStatus(objAuthService: clsAuthService = Depends(getAuthService)) -> dict:
    # Auth routes stay thin: they receive dependencies, call services, and return standardized responses.
    return buildResponse(True, "Authentication service is available.", {"ssoEnabled": True})
