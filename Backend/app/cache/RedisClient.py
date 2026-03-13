import json
import logging
from typing import Any

import redis.asyncio as redis_async
from redis import Redis
from redis.exceptions import RedisError

from app.core.Config import clsSettings

objLogger = logging.getLogger(__name__)


class clsRedisClient:
    objAsyncClient: redis_async.Redis | None = None

    def __init__(self, objSettings: clsSettings) -> None:
        # Cache configuration flows from settings. When Redis is disabled, this wrapper safely no-ops.
        self.objSettings = objSettings
        self.objClient: Redis | None = None
        if objSettings.ENABLE_REDIS:
            self.objClient = Redis.from_url(objSettings.strRedisUrl, decode_responses=True)

    @classmethod
    def getRedis(cls, objSettings: clsSettings) -> redis_async.Redis:
        # Async middleware and services share one Redis client instance for pooled session access.
        if cls.objAsyncClient is None:
            cls.objAsyncClient = redis_async.from_url(
                objSettings.strRedisUrl,
                decode_responses=True,
                max_connections=objSettings.REDIS_MAX_CONNECTIONS,
            )
        return cls.objAsyncClient

    @classmethod
    async def closeRedis(cls) -> None:
        # Application shutdown closes the shared async Redis client cleanly.
        if cls.objAsyncClient is not None:
            await cls.objAsyncClient.aclose()
            cls.objAsyncClient = None

    def get(self, strKey: str) -> Any | None:
        # Services call this before hitting the repository so cached results can short-circuit database reads.
        if not self.objClient:
            return None
        try:
            strValue = self.objClient.get(strKey)
            return json.loads(strValue) if strValue else None
        except (RedisError, json.JSONDecodeError):
            objLogger.warning("Redis get failed for key=%s", strKey)
            return None

    def set(self, strKey: str, objValue: Any, intExpireSeconds: int = 300) -> None:
        # Fresh service results flow back into Redis here for later requests.
        if not self.objClient:
            return
        try:
            self.objClient.set(strKey, json.dumps(objValue), ex=intExpireSeconds)
        except (RedisError, TypeError):
            objLogger.warning("Redis set failed for key=%s", strKey)

    def ping(self) -> bool:
        # Health checks call this to confirm Redis is reachable when caching is enabled.
        if not self.objClient:
            return False
        try:
            return bool(self.objClient.ping())
        except RedisError:
            objLogger.warning("Redis ping failed.")
            return False
