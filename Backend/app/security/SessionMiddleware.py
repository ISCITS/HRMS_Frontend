from fastapi import Request, status
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.Config import clsSettings
from app.security.SessionService import clsSessionService
from app.utilities.ResponseHelper import buildResponse


class clsSessionMiddleware(BaseHTTPMiddleware):
    def __init__(self, objApp, objSettings: clsSettings) -> None:
        # Session middleware centralizes Redis-backed session validation before route logic executes.
        super().__init__(objApp)
        self.objSettings = objSettings
        self.objSessionService = clsSessionService(objSettings)
        self.setBypassPaths = {"/health", "/docs", "/openapi.json", "/redoc"}

    def shouldBypass(self, objRequest: Request) -> bool:
        return objRequest.url.path in self.setBypassPaths

    async def dispatch(self, objRequest: Request, call_next) -> Response:
        if self.shouldBypass(objRequest):
            return await call_next(objRequest)

        try:
            strAuthorization = objRequest.headers.get("Authorization")
            dicSessionData = await self.objSessionService.validateSession(strAuthorization)
            objRequest.state.dicSession = dicSessionData
            return await call_next(objRequest)
        except Exception as objException:
            intStatusCode = getattr(objException, "status_code", status.HTTP_500_INTERNAL_SERVER_ERROR)
            strMessage = getattr(objException, "detail", "Internal server error.")
            return JSONResponse(
                status_code=intStatusCode,
                content=buildResponse(False, strMessage, {}),
            )
