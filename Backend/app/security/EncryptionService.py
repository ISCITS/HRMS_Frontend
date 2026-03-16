import json
from base64 import b64decode, b64encode
from typing import Any

from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from fastapi import HTTPException, status

from app.core.Config import clsSettings


class clsEncryptionService:
    def __init__(self, objSettings: clsSettings) -> None:
        # Encryption and decryption use the frontend-compatible AES-CBC contract across all requests.
        self.objSettings = objSettings
        self.bytPayloadKey = objSettings.PAYLOAD_ENCRYPTION_KEY.encode("utf-8")
        self.bytPayloadIv = objSettings.PAYLOAD_ENCRYPTION_IV.encode("utf-8")
        self.bytPasswordKey = objSettings.PASSWORD_SECRET_KEY.encode("utf-8")
        self.bytPasswordIv = objSettings.PASSWORD_SECRET_IV.encode("utf-8")

    def decryptAES(self, strEncryptedValue: str, bytKey: bytes, bytIv: bytes) -> str:
        try:
            objCipher = Cipher(algorithms.AES(bytKey), modes.CBC(bytIv))
            objDecryptor = objCipher.decryptor()
            bytDecryptedPadded = objDecryptor.update(b64decode(strEncryptedValue)) + objDecryptor.finalize()
            objUnpadder = padding.PKCS7(algorithms.AES.block_size).unpadder()
            bytDecryptedValue = objUnpadder.update(bytDecryptedPadded) + objUnpadder.finalize()
            return bytDecryptedValue.decode("utf-8")
        except Exception as objException:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to decrypt request payload",
            ) from objException

    def encryptAES(self, strValue: str, bytKey: bytes, bytIv: bytes) -> str:
        objCipher = Cipher(algorithms.AES(bytKey), modes.CBC(bytIv))
        objPadder = padding.PKCS7(algorithms.AES.block_size).padder()
        bytPaddedValue = objPadder.update(strValue.encode("utf-8")) + objPadder.finalize()
        objEncryptor = objCipher.encryptor()
        bytEncryptedValue = objEncryptor.update(bytPaddedValue) + objEncryptor.finalize()
        return b64encode(bytEncryptedValue).decode("utf-8")

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
            bytDecryptedPayload = self.decryptAES(
                strEncryptedPayload,
                self.bytPayloadKey,
                self.bytPayloadIv,
            ).encode("utf-8")
            json.loads(bytDecryptedPayload.decode("utf-8"))
            return bytDecryptedPayload
        except (HTTPException, json.JSONDecodeError) as objException:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to decrypt request payload",
            ) from objException

    def encryptResponse(self, objPayload: Any) -> dict[str, str]:
        if not self.objSettings.ENABLE_PAYLOAD_ENCRYPTION:
            return objPayload

        strSerializedPayload = json.dumps(objPayload)
        strEncryptedPayload = self.encryptAES(
            strSerializedPayload,
            self.bytPayloadKey,
            self.bytPayloadIv,
        )
        return {"payload": strEncryptedPayload}

    def decryptPassword(self, strEncryptedPassword: str) -> str:
        return self.decryptAES(strEncryptedPassword, self.bytPasswordKey, self.bytPasswordIv)
