import json

from fastapi import Request, status
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.Config import clsSettings
from app.security.CSRFService import clsCSRFService
from app.security.EncryptionService import clsEncryptionService
from app.utilities.ResponseHelper import buildResponse


class clsSecurityMiddleware(BaseHTTPMiddleware):
    def __init__(self, objApp, objSettings: clsSettings) -> None:
        # The middleware coordinates the complete request security pipeline for every protected API request.
        super().__init__(objApp)
        self.objSettings = objSettings
        self.objCSRFService = clsCSRFService(objSettings)
        self.objEncryptionService = clsEncryptionService(objSettings)
        self.setBypassPaths = {"/health", "/docs", "/openapi.json", "/redoc"}

    def shouldBypass(self, objRequest: Request) -> bool:
        return objRequest.url.path in self.setBypassPaths

    async def replaceRequestBody(self, objRequest: Request, bytBody: bytes) -> None:
        async def receive() -> dict:
            return {"type": "http.request", "body": bytBody, "more_body": False}

        objRequest._body = bytBody
        objRequest._receive = receive

    def buildFailureResponse(self, intStatusCode: int, strMessage: str) -> JSONResponse:
        dicPayload = buildResponse(False, strMessage, {})
        if self.objSettings.ENABLE_PAYLOAD_ENCRYPTION:
            dicPayload = self.objEncryptionService.encryptResponse(dicPayload)
        return JSONResponse(status_code=intStatusCode, content=dicPayload)

    async def encryptResponse(self, objResponse: Response) -> Response:
        if not self.objSettings.ENABLE_PAYLOAD_ENCRYPTION:
            return objResponse

        bytBody = getattr(objResponse, "body", b"") or b""
        objBodyIterator = getattr(objResponse, "body_iterator", None)
        if objBodyIterator:
            bytBody = b""
            async for bytChunk in objBodyIterator:
                bytBody += bytChunk

        try:
            objPayload = json.loads(bytBody.decode("utf-8")) if bytBody else {}
        except json.JSONDecodeError:
            objPayload = {"raw": bytBody.decode("utf-8", errors="ignore")}

        dicEncryptedResponse = self.objEncryptionService.encryptResponse(objPayload)
        dicHeaders = dict(objResponse.headers)
        dicHeaders.pop("content-length", None)
        return JSONResponse(
            status_code=objResponse.status_code,
            content=dicEncryptedResponse,
            headers=dicHeaders,
        )

    async def dispatch(self, objRequest: Request, call_next) -> Response:
        if self.shouldBypass(objRequest):
            return await call_next(objRequest)

        try:
            strOrigin = objRequest.headers.get("Origin")
            strCSRFToken = objRequest.headers.get("X-CSRF-Token")
            self.objCSRFService.validateOrigin(strOrigin)
            self.objCSRFService.validateCSRFToken(strCSRFToken, strOrigin)

            bytRequestBody = await objRequest.body()
            bytDecryptedBody = self.objEncryptionService.decryptPayload(bytRequestBody)
            await self.replaceRequestBody(objRequest, bytDecryptedBody)
            objResponse = await call_next(objRequest)
            return await self.encryptResponse(objResponse)
        except Exception as objException:
            intStatusCode = getattr(objException, "status_code", status.HTTP_500_INTERNAL_SERVER_ERROR)
            strMessage = getattr(objException, "detail", "Internal server error.")
            return self.buildFailureResponse(intStatusCode, strMessage)
