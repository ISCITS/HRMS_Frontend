export const apiConstants = {
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  apiPrefix: "/api",
  csrfSecretKey: process.env.NEXT_PUBLIC_CSRF_SECRET_KEY ?? "hrms-saas-csrf-secret",
  csrfHeaderName: "X-CSRF-Token",
  csrfTokenTtlSeconds: 60 * 10
} as const;

