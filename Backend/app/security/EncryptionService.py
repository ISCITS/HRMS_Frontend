import json
import base64
from typing import Any

from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

from fastapi import HTTPException, status

from app.core.Config import clsSettings


class clsEncryptionService:

    def __init__(self, objSettings: clsSettings) -> None:

        self.objSettings = objSettings
        self.strSecretKey = objSettings.HRMS_CSRF_SECRET_KEY

        print("========== Encryption Service Initialized ==========")
        print("Secret Key (base64):", self.strSecretKey)

        try:
            # Decode base64 secret -> AES key
            self.bytKey = base64.b64decode(self.strSecretKey)
        except Exception as objException:
            print("ERROR decoding secret key:", objException)
            raise

        print("Decoded AES key length:", len(self.bytKey))

        if len(self.bytKey) not in (16, 24, 32):
            raise ValueError(f"Invalid AES key length: {len(self.bytKey)}")

        # Use first 16 bytes as IV
        self.bytIV = self.bytKey[:16]

        print("AES Key:", self.bytKey)
        print("AES IV:", self.bytIV)
        print("Payload Encryption Enabled:", self.objSettings.ENABLE_PAYLOAD_ENCRYPTION)
        print("====================================================")

        self.bytPasswordKey = self.objSettings.PASSWORD_SECRET_KEY.encode("utf-8")
        self.bytPasswordIV = self.objSettings.PASSWORD_SECRET_IV.encode("utf-8")


    # -----------------------------------------------------
    # Decrypt Request Payload
    # -----------------------------------------------------

    def decryptPayload(self, bytBody: bytes) -> bytes:

        print("\n----- Decrypt Payload Start -----")

        if not self.objSettings.ENABLE_PAYLOAD_ENCRYPTION:
            print("Encryption disabled → returning raw body")
            return bytBody

        if not bytBody:
            print("Empty body received")
            return bytBody

        print("Raw request body:", bytBody)

        try:
            dicBody = json.loads(bytBody.decode("utf-8"))
            print("Parsed request JSON:", dicBody)
        except json.JSONDecodeError as objException:
            print("JSON decode error:", objException)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid encrypted payload",
            ) from objException

        strEncryptedPayload = dicBody.get("payload")

        if not strEncryptedPayload:
            print("Payload field missing")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid encrypted payload",
            )

        print("Encrypted payload:", strEncryptedPayload)

        try:

            bytEncrypted = base64.b64decode(strEncryptedPayload)

            print("Decoded encrypted bytes:", bytEncrypted)

            objCipher = AES.new(self.bytKey, AES.MODE_CBC, self.bytIV)

            bytDecrypted = unpad(objCipher.decrypt(bytEncrypted), AES.block_size)

            print("Decrypted bytes:", bytDecrypted)

            # Validate JSON
            json.loads(bytDecrypted.decode("utf-8"))

            print("Decryption successful")
            print("----- Decrypt Payload End -----\n")

            return bytDecrypted

        except Exception as objException:

            print("Decryption failed:", objException)

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to decrypt request payload",
            ) from objException


    # -----------------------------------------------------
    # Encrypt Response
    # -----------------------------------------------------

    def encryptResponse(self, objPayload: Any) -> dict[str, str]:

        print("\n----- Encrypt Response Start -----")

        if not self.objSettings.ENABLE_PAYLOAD_ENCRYPTION:
            print("Encryption disabled → returning raw response")
            return objPayload

        try:

            strPayload = json.dumps(objPayload)

            print("Response JSON:", strPayload)

            bytPayload = strPayload.encode("utf-8")

            objCipher = AES.new(self.bytKey, AES.MODE_CBC, self.bytIV)

            bytEncrypted = objCipher.encrypt(pad(bytPayload, AES.block_size))

            strEncryptedPayload = base64.b64encode(bytEncrypted).decode("utf-8")

            print("Encrypted response:", strEncryptedPayload)

            print("----- Encrypt Response End -----\n")

            return {
                "payload": strEncryptedPayload
            }

        except Exception as objException:

            print("Response encryption failed:", objException)

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to encrypt response",
            ) from objException

    # -----------------------------------------------------
    # Decrypt Login Password
    # -----------------------------------------------------

    def decryptPassword(self, strEncryptedPassword: str) -> str:

        if not strEncryptedPassword:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password is required",
            )

        try:
            bytEncryptedPassword = base64.b64decode(strEncryptedPassword)
            objCipher = AES.new(self.bytPasswordKey, AES.MODE_CBC, self.bytPasswordIV)
            bytDecryptedPassword = unpad(objCipher.decrypt(bytEncryptedPassword), AES.block_size)
            return bytDecryptedPassword.decode("utf-8")
        except Exception as objException:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to decrypt password",
            ) from objException
