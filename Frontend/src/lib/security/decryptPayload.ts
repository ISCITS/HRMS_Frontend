import CryptoJS from "crypto-js";
import { apiConstants } from "@/config/constants";

/*
Designed as an async boundary so this implementation can be swapped to Web Crypto
later without changing the server-side payload handling contract.
*/
export async function decryptPayload<TPayload = unknown>(encryptedPayload: string): Promise<TPayload> {
  const objKey = CryptoJS.enc.Utf8.parse(apiConstants.payloadEncryptionKey);
  const objIv = CryptoJS.enc.Utf8.parse(apiConstants.payloadEncryptionIv);

  const objDecrypted = CryptoJS.AES.decrypt(encryptedPayload, objKey, {
    iv: objIv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  const strPayload = objDecrypted.toString(CryptoJS.enc.Utf8);

  if (!strPayload) {
    throw new Error("Payload decryption failed.");
  }

  return JSON.parse(strPayload) as TPayload;
}
