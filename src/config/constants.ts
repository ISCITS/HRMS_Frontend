function normalizePublicApiBaseUrl(strValue: string | undefined) {
  const strBaseUrl = (strValue ?? "").trim().replace(/\/+$/g, "");
  return strBaseUrl.endsWith("/api") ? strBaseUrl.slice(0, -"/api".length) : strBaseUrl;
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
