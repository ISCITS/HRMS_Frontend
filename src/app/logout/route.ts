import { NextResponse } from "next/server";
import { appConfig, appRoutes } from "@/config";

// Handles logout by clearing auth cookie and redirecting to login.
export async function GET(req: Request) {
  const objRequestUrl = new URL(req.url);
  const strCookieHeader = req.headers.get("cookie") ?? "";
  const strTenantCookiePrefix = `${appConfig.tenantCookieName}=`;
  const strTenantUuidFromQuery = (objRequestUrl.searchParams.get("tenantUuid") || "").trim();
  const strTenantUUIDFromCookie = strCookieHeader
    .split(";")
    .map((strItem) => strItem.trim())
    .find((strItem) => strItem.startsWith(strTenantCookiePrefix))
    ?.slice(strTenantCookiePrefix.length) ?? "";

  const strTenantUUID = strTenantUuidFromQuery || strTenantUUIDFromCookie;
  const strRedirectPath = strTenantUUID
    ? `${appRoutes.login}/${decodeURIComponent(strTenantUUID)}`
    : "/session-expired";

  const strForwardedHost = (req.headers.get("x-forwarded-host") || "").split(",")[0].trim();
  const strHost = strForwardedHost || (req.headers.get("host") || "").trim();
  const strForwardedProto = (req.headers.get("x-forwarded-proto") || "").split(",")[0].trim();
  const strProto = strForwardedProto || objRequestUrl.protocol.replace(":", "") || "http";

  const objRedirectBaseUrl = new URL(objRequestUrl.toString());
  if (strHost) {
    objRedirectBaseUrl.host = strHost;
    objRedirectBaseUrl.protocol = `${strProto}:`;
  }

  if (
    objRedirectBaseUrl.hostname === "0.0.0.0" ||
    objRedirectBaseUrl.hostname === "::" ||
    objRedirectBaseUrl.hostname === "[::]"
  ) {
    objRedirectBaseUrl.hostname = "localhost";
  }

  const strLoginUrl = new URL(strRedirectPath, objRedirectBaseUrl);
  const dicResponse = NextResponse.redirect(strLoginUrl);
  dicResponse.cookies.set(appConfig.authCookieName, "", { path: "/", maxAge: 0 });

  if (strTenantUUID) {
    dicResponse.cookies.set(appConfig.tenantCookieName, decodeURIComponent(strTenantUUID), {
      path: "/",
      maxAge: appConfig.authCookieMaxAgeSeconds,
    });
  } else {
    dicResponse.cookies.set(appConfig.tenantCookieName, "", { path: "/", maxAge: 0 });
  }

  return dicResponse;
}
