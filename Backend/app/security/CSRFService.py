import base64
import hashlib
import hmac

from fastapi import HTTPException, status

from app.core.Config import clsSettings


class clsCSRFService:
    def __init__(self, objSettings: clsSettings) -> None:
        # CSRF validation uses centralized settings so all routes inherit the same rules.
        self.objSettings = objSettings
        self.bytSecretKey = objSettings.HRMS_CSRF_SECRET_KEY.encode("utf-8")

    def generateCSRFToken(self, strOrigin: str) -> str:
        # The token is an HMAC of the allowed origin using the configured secret key.
        bytSignature = hmac.new(self.bytSecretKey, strOrigin.encode("utf-8"), hashlib.sha256).digest()
        return base64.urlsafe_b64encode(bytSignature).decode("utf-8")

    def validateOrigin(self, strOrigin: str | None) -> None:
        if not self.objSettings.ENABLE_CSRF_PROTECTION:
            return
        if not strOrigin or strOrigin not in self.objSettings.lstAllowedOrigins:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid request origin",
            )

    def validateCSRFToken(self, strToken: str | None, strOrigin: str | None) -> None:
        if not self.objSettings.ENABLE_CSRF_PROTECTION:
            return
        if not strToken or not strOrigin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid CSRF Token",
            )

        strExpectedToken = self.generateCSRFToken(strOrigin)
        if not hmac.compare_digest(strToken, strExpectedToken):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid CSRF Token",
            )
