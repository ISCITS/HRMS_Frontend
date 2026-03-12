import json
from datetime import datetime, timezone

import jwt
from fastapi import HTTPException, status

from app.cache.RedisClient import clsRedisClient
from app.core.Config import clsSettings


class clsSessionService:
    def __init__(self, objSettings: clsSettings) -> None:
        # Session state is centralized here so route handlers remain stateless and focused on business logic.
        self.objSettings = objSettings
        self.intSessionTimeoutSeconds = objSettings.SESSION_TIMEOUT_MINUTES * 60

    def getSessionKey(self, strAuthorization: str) -> str:
        strToken = strAuthorization.replace("Bearer ", "", 1).strip()
        return f"session:{strToken}"

    def getUserIdFromToken(self, strToken: str) -> str:
        if strToken.count(".") != 2:
            return strToken
        try:
            dicClaims = jwt.decode(
                strToken,
                options={"verify_signature": False, "verify_exp": False, "verify_aud": False},
                algorithms=["RS256", "HS256"],
            )
            return str(dicClaims.get("sub") or dicClaims.get("oid") or strToken)
        except Exception:
            return strToken

    async def createSession(self, strAuthorization: str) -> dict:
        strToken = strAuthorization.replace("Bearer ", "", 1).strip()
        strSessionKey = self.getSessionKey(strAuthorization)
        dicSessionData = {
            "userId": self.getUserIdFromToken(strToken),
            "dtLastActivity": datetime.now(timezone.utc).isoformat(),
        }
        objRedis = clsRedisClient.getRedis(self.objSettings)
        await objRedis.set(strSessionKey, json.dumps(dicSessionData), ex=self.intSessionTimeoutSeconds)
        return dicSessionData

    async def deleteSession(self, strAuthorization: str) -> None:
        strSessionKey = self.getSessionKey(strAuthorization)
        objRedis = clsRedisClient.getRedis(self.objSettings)
        await objRedis.delete(strSessionKey)

    async def refreshSession(self, strAuthorization: str | None, dicSessionData: dict | None = None) -> dict | None:
        if not strAuthorization or not strAuthorization.startswith("Bearer "):
            return None

        strSessionKey = self.getSessionKey(strAuthorization)
        if not dicSessionData:
            return None

        dicSessionData["dtLastActivity"] = datetime.now(timezone.utc).isoformat()
        objRedis = clsRedisClient.getRedis(self.objSettings)
        await objRedis.set(strSessionKey, json.dumps(dicSessionData), ex=self.intSessionTimeoutSeconds)
        return dicSessionData

    async def validateSession(self, strAuthorization: str | None) -> dict | None:
        if not strAuthorization or not strAuthorization.startswith("Bearer "):
            return None

        strSessionKey = self.getSessionKey(strAuthorization)
        objRedis = clsRedisClient.getRedis(self.objSettings)
        strSessionPayload = await objRedis.get(strSessionKey)
        if not strSessionPayload:
            return await self.createSession(strAuthorization)

        dicSessionData = json.loads(strSessionPayload)
        dtLastActivity = datetime.fromisoformat(dicSessionData["dtLastActivity"])
        if dtLastActivity.tzinfo is None:
            dtLastActivity = dtLastActivity.replace(tzinfo=timezone.utc)

        intTimeSinceLastActivity = int((datetime.now(timezone.utc) - dtLastActivity).total_seconds())
        if intTimeSinceLastActivity > self.intSessionTimeoutSeconds:
            await self.deleteSession(strAuthorization)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired",
            )

        return await self.refreshSession(strAuthorization, dicSessionData)
