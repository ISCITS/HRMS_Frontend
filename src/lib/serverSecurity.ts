import { apiConstants } from "@/config/constants";

export function getServerCsrfSecretKey() {
  return (
    process.env.HRMS_CSRF_SECRET_KEY?.trim() ||
    process.env.NEXT_PUBLIC_CSRF_SECRET_KEY?.trim() ||
    apiConstants.csrfSecretKey
  );
}

export function getServerAppOrigin() {
  return process.env.NEXT_PUBLIC_APP_ORIGIN?.trim() || "http://localhost:3000";
}

export function shouldUseSecureAuthCookies() {
  const strCookieSecure = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();
  if (strCookieSecure === "true") {
    return true;
  }
  if (strCookieSecure === "false") {
    return false;
  }

  return getServerAppOrigin().startsWith("https://");
}
