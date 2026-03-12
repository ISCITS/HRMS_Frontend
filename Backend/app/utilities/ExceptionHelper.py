import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette import status

from app.exceptions.CustomExceptions import AppException
from app.utilities.ResponseHelper import buildResponse

objLogger = logging.getLogger(__name__)


def registerExceptionHandlers(objApp: FastAPI) -> None:
    # Exceptions raised anywhere in the request pipeline are normalized here into the standard API envelope.
    @objApp.exception_handler(AppException)
    async def handleAppException(objRequest: Request, objException: AppException) -> JSONResponse:
        objLogger.warning("Handled application exception on path=%s", objRequest.url.path)
        return JSONResponse(
            status_code=objException.intStatusCode,
            content=buildResponse(False, objException.strMessage, {}),
        )

    @objApp.exception_handler(RequestValidationError)
    async def handleValidationException(
        objRequest: Request, objException: RequestValidationError
    ) -> JSONResponse:
        objLogger.warning("Validation error on path=%s", objRequest.url.path)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=buildResponse(False, "Validation failed.", {"errors": objException.errors()}),
        )

    @objApp.exception_handler(Exception)
    async def handleUnhandledException(objRequest: Request, objException: Exception) -> JSONResponse:
        objLogger.exception("Unhandled exception on path=%s", objRequest.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=buildResponse(False, "Internal server error.", {}),
        )
