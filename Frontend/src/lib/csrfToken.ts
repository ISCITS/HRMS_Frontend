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
  const signedValue = CryptoJS.HmacSHA256(unsignedToken, secretKey);
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
  if (!globalThis.crypto?.randomUUID) {
    throw new Error("crypto.randomUUID is not available in the current runtime.");
  }

  const header: CSRFHeader = {
    alg: "HS256",
    typ: "JWT"
  };

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const payload: CSRFPayload = {
    jti: globalThis.crypto.randomUUID(),
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
