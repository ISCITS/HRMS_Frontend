import { appConfig } from "@/config";

/*
Functional responsibility:
- Share lightweight auth helpers across middleware, routes, and services.

Inputs:
- Cookie values or auth state from the current request context.

Output:
- Canonical auth cookie metadata and simple auth checks.

Failure behavior:
- Unknown cookie values are treated as unauthenticated.
*/
export const authHelpers = {
  cookieName: appConfig.authCookieName,
  tenantCookieName: appConfig.tenantCookieName,
  isAuthenticated(cookieValue?: string) {
    return Boolean(cookieValue?.trim());
  },
  getCookieValue(strCookieName: string) {
    if (typeof document === "undefined") {
      return "";
    }

    const strMatch = document.cookie
      .split("; ")
      .find((strItem) => strItem.startsWith(`${strCookieName}=`));

    return strMatch ? decodeURIComponent(strMatch.split("=", 2)[1] ?? "") : "";
  },
  getAccessToken() {
    return this.getCookieValue(this.cookieName);
  },
  setAuthenticatedSession(strAccessToken: string, strTenantUUID?: string) {
    if (typeof document === "undefined") {
      return;
    }

    document.cookie = `${this.cookieName}=${encodeURIComponent(strAccessToken)}; Path=/; Max-Age=${appConfig.authCookieMaxAgeSeconds}; SameSite=Lax`;
    if (strTenantUUID) {
      document.cookie = `${this.tenantCookieName}=${encodeURIComponent(strTenantUUID)}; Path=/; Max-Age=${appConfig.authCookieMaxAgeSeconds}; SameSite=Lax`;
    }
  },
  clearSession() {
    if (typeof document === "undefined") {
      return;
    }

    document.cookie = `${this.cookieName}=; Path=/; Max-Age=0; SameSite=Lax`;
    document.cookie = `${this.tenantCookieName}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
};
