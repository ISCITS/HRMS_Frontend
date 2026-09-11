import CryptoJS from "crypto-js";
import { apiConstants } from "@/config/constants";

function serializePayload(payload: unknown) {
  const setSeenObjects = new WeakSet<object>();

  try {
    const strSerialized = JSON.stringify(payload, (_key, value: unknown) => {
      if (typeof value === "bigint") {
        return value.toString();
      }

      if (typeof value === "object" && value !== null) {
        if (setSeenObjects.has(value)) {
          throw new TypeError("Circular payloads cannot be encrypted.");
        }

        setSeenObjects.add(value);
      }

      return value;
    });

    if (typeof strSerialized !== "string") {
      throw new TypeError("Payload could not be serialized for encryption.");
    }

    return strSerialized;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Payload serialization failed before encryption."
    );
  }
}

/*
Designed as an async boundary so this implementation can be swapped to Web Crypto
later without changing the shared Axios interceptor contract.
*/
export async function encryptPayload(payload: unknown) {
  const strSerializedPayload = serializePayload(payload);
  const objKey = CryptoJS.enc.Base64.parse(apiConstants.csrfSecretKey);
  const objIv = CryptoJS.lib.WordArray.create(objKey.words.slice(0, 4), 16);

  const objEncrypted = CryptoJS.AES.encrypt(strSerializedPayload, objKey, {
    iv: objIv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  return objEncrypted.toString();
}
