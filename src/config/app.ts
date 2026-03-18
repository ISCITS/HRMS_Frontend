export const appConfig = {
  appName: "HRMS",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  authCookieName: "hrms_auth",
  authCookieMaxAgeSeconds: 60 * 60 * 8
} as const;

