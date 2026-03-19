export const appConfig = {
  appName: "HRMS",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  authCookieName: "hrms_access_token",
  authCookieMaxAgeSeconds: 60 * 60 * 8,
  tenantCookieName: "hrms_tenant_uuid",
  userContextCookieName: "hrms_user_context"
} as const;

