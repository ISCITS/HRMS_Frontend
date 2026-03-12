from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.cache.RedisClient import clsRedisClient
from app.core.Config import getSettings
from app.database.SessionManager import isDatabaseConnected

objRouter = APIRouter(tags=["Health"])


@objRouter.get("/health")
def getHealth() -> JSONResponse:
    # Health flow: API process check -> live database check -> optional Redis check -> structured status response.
    objSettings = getSettings()
    boolDatabaseConnected = isDatabaseConnected()

    strRedisStatus = "disabled"
    boolRedisHealthy = True
    if objSettings.ENABLE_REDIS:
        objRedisClient = clsRedisClient(objSettings)
        boolRedisHealthy = objRedisClient.ping()
        strRedisStatus = "connected" if boolRedisHealthy else "disconnected"

    boolHealthy = boolDatabaseConnected and boolRedisHealthy
    dicResponse = {
        "status": "healthy" if boolHealthy else "unhealthy",
        "database": "connected" if boolDatabaseConnected else "disconnected",
        "redis": strRedisStatus,
    }
    intStatusCode = status.HTTP_200_OK if boolHealthy else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=intStatusCode, content=dicResponse)
