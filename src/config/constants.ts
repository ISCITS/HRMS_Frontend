function normalizePublicApiBaseUrl(strValue: string | undefined) {
  let strBaseUrl = (strValue ?? "").trim().replace(/\/+$/g, "");
  if (strBaseUrl.endsWith("/api")) {
    strBaseUrl = strBaseUrl.slice(0, -"/api".length);
  }

  // In browser sessions on local/dev, host.docker.internal can fail DNS resolution.
  // Use explicit IPv4 localhost because Windows Docker localhost may prefer a slow/broken IPv6 path.
  if (typeof window !== "undefined" && strBaseUrl.includes("host.docker.internal")) {
    try {
      const objUrl = new URL(strBaseUrl);
      const strLocalHost = window.location.hostname || "localhost";
      if (strLocalHost === "localhost" || strLocalHost === "127.0.0.1") {
        objUrl.hostname = "127.0.0.1";
        strBaseUrl = objUrl.toString().replace(/\/+$/g, "");
      }
    } catch {
      // Keep configured base URL if parsing fails.
    }
  }

  return strBaseUrl;
}

export const apiConstants = {
  baseURL: normalizePublicApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL),
  apiPrefix: "api/v1",
  csrfSecretKey: process.env.NEXT_PUBLIC_CSRF_SECRET_KEY ?? "hrms-saas-csrf-secret",
  passwordSecretKey: process.env.NEXT_PUBLIC_PASSWORD_SECRET_KEY ?? "hrms-pass-key-16",
  passwordSecretIv: process.env.NEXT_PUBLIC_PASSWORD_SECRET_IV ?? "hrms-pass-iv-123",
  payloadEncryptionKey: process.env.NEXT_PUBLIC_PAYLOAD_ENCRYPTION_KEY ?? "payload-key-1234",
  payloadEncryptionIv: process.env.NEXT_PUBLIC_PAYLOAD_ENCRYPTION_IV ?? "payload-iv--1234",
  csrfHeaderName: "X-CSRF-Token",
  csrfTokenTtlSeconds: 60 * 10
} as const;
