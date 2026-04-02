import { NextResponse } from "next/server";
import { appConfig, appRoutes } from "@/config";

// Handles logout by clearing auth cookie and redirecting to login.
export async function GET(req: Request) {
  /*
  Functional responsibility:
  - Invalidate user session cookie on logout request.
  
  Inputs:
  - Incoming GET request for /logout.
  
  Output:
  - Redirect response to /login with cleared hrms_auth cookie.
  
  Failure behavior:
  - If cookie is already absent, response still redirects safely to /login.
  */
  const objRequestUrl = new URL(req.url);
  const strCookieHeader = req.headers.get("cookie") ?? "";
  const strTenantCookiePrefix = `${appConfig.tenantCookieName}=`;
  const strTenantUUID = strCookieHeader
    .split(";")
    .map((strItem) => strItem.trim())
    .find((strItem) => strItem.startsWith(strTenantCookiePrefix))
    ?.slice(strTenantCookiePrefix.length) ?? "";
  const strRedirectPath = strTenantUUID
    ? `${appRoutes.login}/${decodeURIComponent(strTenantUUID)}`
    : "/session-expired";
  const strLoginUrl = new URL(strRedirectPath, objRequestUrl);
  const dicResponse = NextResponse.redirect(strLoginUrl);
  dicResponse.cookies.set(appConfig.authCookieName, "", { path: "/", maxAge: 0 });
  if (strTenantUUID) {
    dicResponse.cookies.set(appConfig.tenantCookieName, decodeURIComponent(strTenantUUID), {
      path: "/",
      maxAge: appConfig.authCookieMaxAgeSeconds
    });
  } else {
    dicResponse.cookies.set(appConfig.tenantCookieName, "", { path: "/", maxAge: 0 });
  }
  return dicResponse;
}
