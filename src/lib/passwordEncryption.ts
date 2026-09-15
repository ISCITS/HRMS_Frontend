import CryptoJS from "crypto-js";
import { apiConstants } from "@/config/constants";

/*
Functional responsibility:
- Encrypt login passwords using the shared AES-CBC contract expected by the auth API.

Inputs:
- Plain text password string from the login form.

Output:
- Base64 ciphertext string suitable for transport to the API.

Failure behavior:
- Returns an empty string if encryption fails so the caller can decide how to handle the request.
*/
export function encryptPassBase64(password: string) {
  try {
    const objKey = CryptoJS.enc.Utf8.parse(apiConstants.passwordSecretKey);
    const objIv = CryptoJS.enc.Utf8.parse(apiConstants.passwordSecretIv);

    const objEncrypted = CryptoJS.AES.encrypt(password, objKey, {
      iv: objIv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    return objEncrypted.toString();
  } catch (error) {
    console.error("Error in encryptPassBase64:", error);
    return "";
  }
}
