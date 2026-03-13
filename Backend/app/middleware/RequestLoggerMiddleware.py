import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

objLogger = logging.getLogger(__name__)


class clsRequestLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, objRequest: Request, call_next) -> Response:
        # Each request passes through here first so timing and status data can be logged around the route execution.
        strRequestId = str(uuid.uuid4())
        decStart = time.perf_counter()
        objResponse = await call_next(objRequest)
        decExecutionTime = round((time.perf_counter() - decStart) * 1000, 2)

        objResponse.headers["X-Request-Id"] = strRequestId
        objLogger.info(
            "requestId=%s endpoint=%s executionTimeMs=%s statusCode=%s",
            strRequestId,
            objRequest.url.path,
            decExecutionTime,
            objResponse.status_code,
        )
        return objResponse
