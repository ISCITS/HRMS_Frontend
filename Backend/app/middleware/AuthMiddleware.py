from starlette import status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.services.AuthService import clsAuthService
from app.utilities.ResponseHelper import buildResponse


class clsAuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, objApp, objAuthService: clsAuthService) -> None:
        # The middleware sits at the HTTP boundary and delegates token validation to the auth service.
        super().__init__(objApp)
        self.objAuthService = objAuthService

    async def dispatch(self, objRequest: Request, call_next) -> Response:
        # Request flow: HTTP request -> bearer token extraction -> auth service -> claims on request state -> route.
        if objRequest.url.path in {"/health", "/docs", "/openapi.json", "/redoc"}:
            return await call_next(objRequest)

        strAuthorization = objRequest.headers.get("Authorization", "")
        if not strAuthorization.startswith("Bearer "):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content=buildResponse(False, "Missing bearer token.", {}),
            )

        strToken = strAuthorization.replace("Bearer ", "", 1).strip()
        dicClaims = self.objAuthService.validateToken(strToken)
        objRequest.state.dicClaims = dicClaims
        return await call_next(objRequest)
