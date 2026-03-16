import base64
import hmac
import json
import time
import hashlib

from fastapi import HTTPException, status
from app.core.Config import clsSettings


class clsCSRFService:

    def __init__(self, objSettings: clsSettings) -> None:

        self.objSettings = objSettings

        # IMPORTANT: use UTF-8 string bytes (same as CryptoJS)
        self.bytSecretKey = objSettings.HRMS_CSRF_SECRET_KEY.encode("utf-8")

        print("CSRF Secret Loaded:", objSettings.HRMS_CSRF_SECRET_KEY)
        print("Secret Bytes:", self.bytSecretKey)


    def decodeBase64Url(self, value: str) -> bytes:

        padding = len(value) % 4

        if padding:
            value += "=" * (4 - padding)

        return base64.urlsafe_b64decode(value.encode())


    def validateOrigin(self, origin: str | None) -> None:

        if not self.objSettings.ENABLE_CSRF_PROTECTION:
            print("CSRF disabled")
            return

        print("Origin received:", origin)
        print("Allowed origins:", self.objSettings.lstAllowedOrigins)

        if not origin:
            print("HERE 1 - Missing Origin")

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid request origin"
            )

        if origin not in self.objSettings.lstAllowedOrigins:
            print("HERE 2 - Origin not allowed")

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid request origin"
            )


    def validateCSRFToken(self, token: str | None, origin: str | None) -> None:

        if not self.objSettings.ENABLE_CSRF_PROTECTION:
            print("CSRF disabled")
            return

        print("CSRF token received:", token)

        if not token:
            print("HERE 3 - Missing token")

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Missing CSRF token"
            )

        parts = token.split(".")

        if len(parts) != 3:
            print("HERE 4 - Invalid token format")

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid CSRF token"
            )

        header_b64, payload_b64, signature = parts

        unsigned_token = f"{header_b64}.{payload_b64}"

        print("Unsigned token:", unsigned_token)

        try:

            expected_signature = base64.urlsafe_b64encode(

                hmac.new(
                    self.bytSecretKey,
                    unsigned_token.encode(),
                    hashlib.sha256
                ).digest()

            ).decode().rstrip("=")

            print("Expected signature:", expected_signature)
            print("Received signature:", signature)

        except Exception as ex:

            print("HERE 5 - Signature generation failed:", ex)

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="CSRF signature generation error"
            )

        if not hmac.compare_digest(expected_signature, signature):

            print("HERE 6 - Signature mismatch")

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid CSRF token"
            )

        try:

            payload = json.loads(self.decodeBase64Url(payload_b64).decode())

            print("Decoded payload:", payload)

        except Exception as ex:

            print("HERE 7 - Payload decode failed:", ex)

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid CSRF payload"
            )

        now = int(time.time())
        expiry = int(payload.get("exp", 0))

        print("Expiry:", expiry)
        print("Current time:", now)

        if expiry <= now:
            print("HERE 8 - Token expired")

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token expired"
            )

        print("CSRF validation PASSED")