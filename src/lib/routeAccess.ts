"use client";

const lstPublicRoutes = ["/", "/home", "/login", "/register", "/forgot-password", "/session-expired"];
const lstPublicPrefixes = ["/t", "/sso/callback", "/HRMS/Administrator"];
const strAuthenticatedHistoryStorageKey = "hrms_authenticated_route_history_v1";

function normalizePathname(strPathname?: string | null) {
  if (!strPathname) {
    return "/";
  }

  if (strPathname === "/") {
    return strPathname;
  }

  return strPathname.endsWith("/") ? strPathname.slice(0, -1) : strPathname;
}

export function isPublicAppRoute(strPathname?: string | null) {
  const strNormalizedPathname = normalizePathname(strPathname);
  const blnTenantLoginRoute = strNormalizedPathname.startsWith("/login/");

  if (lstPublicRoutes.includes(strNormalizedPathname) || blnTenantLoginRoute) {
    return true;
  }

  return lstPublicPrefixes.some((strPrefix) => {
    if (strPrefix === "/t") {
      return strNormalizedPathname === "/t" || strNormalizedPathname.startsWith("/t/");
    }

    return (
      strNormalizedPathname === strPrefix ||
      strNormalizedPathname.startsWith(`${strPrefix}/`)
    );
  });
}

export function isAuthenticatedAppRoute(strPathname?: string | null) {
  return !isPublicAppRoute(strPathname);
}

/*
Routes that an already-authenticated user should never be left sitting on
(e.g. after the browser back/forward button restores them from Next's
client-side route cache without a server round-trip through middleware).
*/
export function isAuthRedirectRoute(strPathname?: string | null) {
  const strNormalizedPathname = normalizePathname(strPathname);
  const blnTenantLoginRoute = strNormalizedPathname.startsWith("/login/");

  return strNormalizedPathname === "/login" || blnTenantLoginRoute || strNormalizedPathname.startsWith("/t/");
}

export function readAuthenticatedRouteHistory() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const strStoredValue = window.sessionStorage.getItem(strAuthenticatedHistoryStorageKey);
    const lstParsedValue = strStoredValue ? JSON.parse(strStoredValue) : [];
    return Array.isArray(lstParsedValue)
      ? lstParsedValue.filter((strValue): strValue is string => typeof strValue === "string" && strValue.length > 0)
      : [];
  } catch {
    return [];
  }
}

export function writeAuthenticatedRouteHistory(lstRoutes: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(strAuthenticatedHistoryStorageKey, JSON.stringify(lstRoutes));
}

