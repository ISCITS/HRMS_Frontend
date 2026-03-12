from fastapi import APIRouter

from app.api.v1.AuthRoutes import objRouter as objAuthRouter
from app.api.v1.UserRoutes import objRouter as objUserRouter
from app.core.Config import clsSettings


def getApiRouter(objSettings: clsSettings) -> APIRouter:
    # The main app calls this once to assemble versioned route groups based on feature flags.
    objRouter = APIRouter(prefix=objSettings.API_V1_PREFIX)
    objRouter.include_router(objUserRouter)
    if objSettings.ENABLE_SSO:
        objRouter.include_router(objAuthRouter)
    return objRouter
