import logging
from typing import Any

import jwt
from fastapi import HTTPException, status
from jwt import PyJWKClient

from app.core.Config import clsSettings

objLogger = logging.getLogger(__name__)


class clsTokenValidator:
    def __init__(self, objSettings: clsSettings) -> None:
        # Security settings flow in from configuration and are used to prepare JWKS validation.
        self.objSettings = objSettings
        self.objJwkClient = PyJWKClient(objSettings.AZURE_JWKS_URL) if objSettings.AZURE_JWKS_URL else None

    def validateToken(self, strToken: str) -> dict[str, Any]:
        # The auth middleware passes the bearer token here.
        # Validated claims flow back to the request pipeline for downstream authorization use.
        if not self.objSettings.ENABLE_SSO:
            return {}
        if not self.objJwkClient:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Invalid SSO setup.")
        try:
            objSigningKey = self.objJwkClient.get_signing_key_from_jwt(strToken)
            dicPayload = jwt.decode(
                strToken,
                objSigningKey.key,
                algorithms=["RS256"],
                audience=self.objSettings.AZURE_CLIENT_ID,
                issuer=self.objSettings.AZURE_ISSUER,
            )
            objLogger.info("Authentication succeeded for subject=%s", dicPayload.get("sub"))
            return dicPayload
        except jwt.PyJWTError as objException:
            objLogger.warning("Authentication failed: %s", str(objException))
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token.") from objException
