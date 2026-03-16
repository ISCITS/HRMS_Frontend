import json
from typing import Any

from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException, status

from app.core.Config import clsSettings


class clsEncryptionService:
    def __init__(self, objSettings: clsSettings) -> None:
        # Encryption and decryption use the shared configured secret key across all requests.
        self.objSettings = objSettings
        self.objCipher = Fernet(objSettings.HRMS_CSRF_SECRET_KEY.encode("utf-8"))

    def decryptPayload(self, bytBody: bytes) -> bytes:
        if not self.objSettings.ENABLE_PAYLOAD_ENCRYPTION or not bytBody:
            return bytBody

        try:
            dicBody = json.loads(bytBody.decode("utf-8"))
        except json.JSONDecodeError as objException:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid encrypted payload",
            ) from objException

        strEncryptedPayload = dicBody.get("payload")
        if not strEncryptedPayload:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid encrypted payload",
            )

        try:
            bytDecryptedPayload = self.objCipher.decrypt(strEncryptedPayload.encode("utf-8"))
            json.loads(bytDecryptedPayload.decode("utf-8"))
            return bytDecryptedPayload
        except (InvalidToken, json.JSONDecodeError) as objException:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to decrypt request payload",
            ) from objException

    def encryptResponse(self, objPayload: Any) -> dict[str, str]:
        if not self.objSettings.ENABLE_PAYLOAD_ENCRYPTION:
            return objPayload

        strSerializedPayload = json.dumps(objPayload)
        strEncryptedPayload = self.objCipher.encrypt(strSerializedPayload.encode("utf-8")).decode("utf-8")
        return {"payload": strEncryptedPayload}
