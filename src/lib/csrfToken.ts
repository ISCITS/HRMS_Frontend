import CryptoJS from "crypto-js";
import { apiConstants } from "@/config/constants";

type CSRFHeader = {
  alg: "HS256";
  typ: "JWT";
};

type CSRFPayload = {
  jti: string;
  act: string;
  iat: number;
  exp: number;
};

function toBase64Url(value: string) {
  const wordArray = CryptoJS.enc.Utf8.parse(value);
  const base64Value = CryptoJS.enc.Base64.stringify(wordArray);

  return base64Value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}


function createSignature(unsignedToken: string, secretKey: string) {
  const signedValue = CryptoJS.HmacSHA256(unsignedToken, CryptoJS.enc.Utf8.parse(secretKey));
  const base64Signature = CryptoJS.enc.Base64.stringify(signedValue);
  return base64Signature.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}


/*
Functional responsibility:
- Generate a signed CSRF token with a JWT-like structure for client API calls.

Inputs:
- Secret key used for HMAC signing and menu action describing the intended operation.

Output:
- Signed JWT-like CSRF token with 10-minute expiry metadata.

Failure behavior:
- Throws if crypto.randomUUID is unavailable in the current runtime.
*/
export function generateCSRFToken(secretKey: string, menuAction: string) {
  const header: CSRFHeader = {
    alg: "HS256",
    typ: "JWT"
  };

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const payload: CSRFPayload = {
    jti: generateTokenId(),
    act: menuAction,
    iat: nowInSeconds,
    exp: nowInSeconds + apiConstants.csrfTokenTtlSeconds
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = createSignature(unsignedToken, secretKey);

  return `${unsignedToken}.${signature}`;
}

function generateTokenId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  if (globalThis.crypto?.getRandomValues) {
    const arrBytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    arrBytes[6] = (arrBytes[6] & 0x0f) | 0x40;
    arrBytes[8] = (arrBytes[8] & 0x3f) | 0x80;
    const strHex = Array.from(arrBytes, (intByte) => intByte.toString(16).padStart(2, "0")).join("");
    return `${strHex.slice(0, 8)}-${strHex.slice(8, 12)}-${strHex.slice(12, 16)}-${strHex.slice(16, 20)}-${strHex.slice(20)}`;
  }

  const strRandomHex = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
  return `${strRandomHex.slice(0, 8)}-${strRandomHex.slice(8, 12)}-${strRandomHex.slice(12, 16)}-${strRandomHex.slice(16, 20)}-${strRandomHex.slice(20)}`;
}





export function encryptPayload(data: unknown, secretKey: string) {

  const json = JSON.stringify(data);

  // decode base64 key
  const key = CryptoJS.enc.Base64.parse(secretKey);

  // IV = first 16 bytes of key
  const iv = CryptoJS.lib.WordArray.create(key.words.slice(0, 4));

  const encrypted = CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(json),
    key,
    {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
  );

  // return raw ciphertext base64
  return CryptoJS.enc.Base64.stringify(encrypted.ciphertext);
}
