import CryptoJS from "crypto-js";
import { apiConstants } from "@/config/constants";

/*
Designed as an async boundary so this implementation can be swapped to Web Crypto
later without changing the server-side payload handling contract.
*/
export async function decryptPayload<TPayload = unknown>(encryptedPayload: string): Promise<TPayload> {
  const objKey = CryptoJS.enc.Base64.parse(apiConstants.csrfSecretKey);
  const objIv = CryptoJS.lib.WordArray.create(objKey.words.slice(0, 4), 16);

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
