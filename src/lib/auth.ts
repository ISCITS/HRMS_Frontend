import { appConfig } from "@/config";

let blnSessionExpiryRedirectInProgress = false;
const strLanguageChangedEventName = "hrms:language-changed";

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
    if (typeof window !== "undefined") {
      const strSessionToken = window.localStorage.getItem("hrms_session_token");
      if (strSessionToken?.trim()) {
        return strSessionToken;
      }
    }

    return this.getCookieValue(this.cookieName);
  },
  getTenantUUID() {
    return this.getCookieValue(this.tenantCookieName);
  },
  getLoginUrl(strTenantUUID?: string) {
    const strResolvedTenantUUID = (strTenantUUID || this.getTenantUUID()).trim();
    return strResolvedTenantUUID
      ? `/login/${encodeURIComponent(strResolvedTenantUUID)}`
      : "/session-expired";
  },
  getSessionExpiredUrl() {
    const strTenantUUID = this.getTenantUUID();
    return strTenantUUID
      ? `/session-expired?tenantUuid=${encodeURIComponent(strTenantUUID)}`
      : "/session-expired";
  },
  setAuthenticatedSession(strAccessToken: string, strTenantUUID?: string) {
    if (typeof document === "undefined") {
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem("hrms_session_token", strAccessToken);
    }
    document.cookie = `${this.cookieName}=${encodeURIComponent(strAccessToken)}; Path=/; Max-Age=${appConfig.authCookieMaxAgeSeconds}; SameSite=Lax`;
    if (strTenantUUID) {
      document.cookie = `${this.tenantCookieName}=${encodeURIComponent(strTenantUUID)}; Path=/; Max-Age=${appConfig.authCookieMaxAgeSeconds}; SameSite=Lax`;
    }
  },
  setTenantContext(intTenantID: number, intCompanyID?: number, intLanguageID?:number, intSecondaryLanguageID?: number) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("hrms_tenant_id", String(intTenantID));
    if (typeof intCompanyID === "number" && Number.isFinite(intCompanyID)) {
      window.localStorage.setItem("hrms_company_id", String(intCompanyID));
    }

    if (typeof intLanguageID === "number" && Number.isFinite(intLanguageID)) {
      window.localStorage.setItem("hrms_language_id", String(intLanguageID));
      window.dispatchEvent(new CustomEvent(strLanguageChangedEventName, { detail: { intLanguageID } }));
    }

    if (typeof intSecondaryLanguageID === "number" && Number.isFinite(intSecondaryLanguageID)) {
      window.localStorage.setItem("hrms_secondary_language_id", String(intSecondaryLanguageID));
    }
  },
  getTenantID() {
    if (typeof window === "undefined") {
      return null;
    }

    const strTenantID = window.localStorage.getItem("hrms_tenant_id");
    const intTenantID = Number(strTenantID);
    return Number.isFinite(intTenantID) && intTenantID > 0 ? intTenantID : null;
  },
  getCompanyID() {
    if (typeof window === "undefined") {
      return null;
    }

    const strCompanyID = window.localStorage.getItem("hrms_company_id");
    const intCompanyID = Number(strCompanyID);
    return Number.isFinite(intCompanyID) && intCompanyID > 0 ? intCompanyID : null;
  },
  setLanguageID(intLanguageID?:number) {
    if (typeof window === "undefined") {
      return;
    }

    if (typeof intLanguageID === "number" && Number.isFinite(intLanguageID)) {
      window.localStorage.setItem("hrms_language_id", String(intLanguageID));
      window.dispatchEvent(new CustomEvent(strLanguageChangedEventName, { detail: { intLanguageID } }));
    }
  },
  getLanguageID() {
    if (typeof window === "undefined") {
      return null;
    }

    const strLanguageID = window.localStorage.getItem("hrms_language_id");
    const intLanguageID = Number(strLanguageID);
    return Number.isFinite(intLanguageID) && intLanguageID > 0 ? intLanguageID : null;
  },
  getSecondaryLanguageID() {
    if (typeof window === "undefined") {
      return null;
    }

    const strLanguageID = window.localStorage.getItem("hrms_secondary_language_id");
    const intLanguageID = Number(strLanguageID);
    return Number.isFinite(intLanguageID) && intLanguageID > 0 ? intLanguageID : null;
  },
  clearSession(blnPreserveTenantContext = false) {
    if (typeof document === "undefined") {
      return;
    }

    const strTenantUUID = this.getTenantUUID();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("hrms_session_token");
      window.localStorage.removeItem("hrms_tenant_id");
      window.localStorage.removeItem("hrms_company_id");
      window.localStorage.removeItem("hrms_language_id");
      window.localStorage.removeItem("hrms_secondary_language_id");
      window.dispatchEvent(new CustomEvent(strLanguageChangedEventName, { detail: { intLanguageID: null } }));
    }
    document.cookie = `${this.cookieName}=; Path=/; Max-Age=0; SameSite=Lax`;
    if (blnPreserveTenantContext && strTenantUUID) {
      document.cookie = `${this.tenantCookieName}=${encodeURIComponent(strTenantUUID)}; Path=/; Max-Age=${appConfig.authCookieMaxAgeSeconds}; SameSite=Lax`;
    } else {
      document.cookie = `${this.tenantCookieName}=; Path=/; Max-Age=0; SameSite=Lax`;
    }
  },
  redirectToSessionExpired() {
    if (typeof window === "undefined") {
      return;
    }

    if (blnSessionExpiryRedirectInProgress) {
      return;
    }

    blnSessionExpiryRedirectInProgress = true;
    const strSessionExpiredUrl = this.getSessionExpiredUrl();
    this.clearSession();
    window.location.replace(strSessionExpiredUrl);
  },
  resetSessionExpiryRedirect() {
    blnSessionExpiryRedirectInProgress = false;
  }
};
