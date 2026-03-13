import json
import secrets
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status

from app.cache.RedisClient import clsRedisClient
from app.core.Config import clsSettings


class clsSessionService:
    def __init__(self, objSettings: clsSettings) -> None:
        # Session state lives in Redis so it survives process restarts and scales across API instances.
        self.objSettings = objSettings
        self.intSessionTimeoutSeconds = objSettings.SESSION_TIMEOUT_MINUTES * 60
        if not objSettings.ENABLE_REDIS:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Redis-backed sessions require ENABLE_REDIS=true",
            )

    def generateSessionToken(self) -> str:
        # Opaque random tokens avoid exposing user details and keep the client contract simple.
        return secrets.token_urlsafe(24)

    def getSessionKey(self, strSessionToken: str) -> str:
        return f"session:{strSessionToken}"

    async def createSession(self, intUserID: int, strUserID: str) -> dict[str, Any]:
        # Successful login flows create one Redis-backed session document with a TTL.
        strSessionToken = self.generateSessionToken()
        strSessionKey = self.getSessionKey(strSessionToken)
        dicSessionData = {
            "intUserID": intUserID,
            "strUserID": strUserID,
            "dtLastActivity": datetime.now(timezone.utc).isoformat(),
        }
        objRedis = clsRedisClient.getRedis(self.objSettings)
        await objRedis.set(strSessionKey, json.dumps(dicSessionData), ex=self.intSessionTimeoutSeconds)
        return {
            "strSessionToken": strSessionToken,
            "dicSessionData": dicSessionData,
        }

    async def deleteSession(self, strSessionToken: str) -> None:
        # Logout and expiration both remove the Redis session record.
        objRedis = clsRedisClient.getRedis(self.objSettings)
        await objRedis.delete(self.getSessionKey(strSessionToken))

    async def refreshSession(self, strSessionToken: str, dicSessionData: dict[str, Any]) -> dict[str, Any]:
        # Each valid request refreshes last activity and resets the TTL window.
        dicSessionData["dtLastActivity"] = datetime.now(timezone.utc).isoformat()
        objRedis = clsRedisClient.getRedis(self.objSettings)
        await objRedis.set(
            self.getSessionKey(strSessionToken),
            json.dumps(dicSessionData),
            ex=self.intSessionTimeoutSeconds,
        )
        return dicSessionData

    async def validateSession(self, strAuthorization: str | None) -> dict[str, Any]:
        if not strAuthorization or not strAuthorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing session token",
            )

        strSessionToken = strAuthorization.replace("Bearer ", "", 1).strip()
        if not strSessionToken:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing session token",
            )

        objRedis = clsRedisClient.getRedis(self.objSettings)
        strSessionPayload = await objRedis.get(self.getSessionKey(strSessionToken))
        if not strSessionPayload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired",
            )

        dicSessionData = json.loads(strSessionPayload)
        dicRefreshedSession = await self.refreshSession(strSessionToken, dicSessionData)
        return {
            "strSessionToken": strSessionToken,
            "dicSessionData": dicRefreshedSession,
        }
