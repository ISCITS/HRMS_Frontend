import { appConfig } from "@/config";
import { AuthStorageKey, AuthStoragePrefix } from "@/Common/enums/AppEnums";

let blnSessionExpiryRedirectInProgress = false;
const strLanguageChangedEventName = "hrms:language-changed";
const strStorageKeyPrefix = AuthStoragePrefix.Hrms;

function clearPrefixedStorage(objStorage: Storage | undefined) {
  if (!objStorage) {
    return;
  }

  const lstKeysToRemove: string[] = [];
  for (let intIndex = 0; intIndex < objStorage.length; intIndex += 1) {
    const strStorageKey = objStorage.key(intIndex);
    if (strStorageKey?.startsWith(strStorageKeyPrefix)) {
      lstKeysToRemove.push(strStorageKey);
    }
  }

  lstKeysToRemove.forEach((strStorageKey) => {
    objStorage.removeItem(strStorageKey);
  });
}

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
      const strSessionToken = window.localStorage.getItem(AuthStorageKey.SessionToken);
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
      : "/login";
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
      window.localStorage.setItem(AuthStorageKey.SessionToken, strAccessToken);
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

    window.localStorage.setItem(AuthStorageKey.TenantId, String(intTenantID));
    if (typeof intCompanyID === "number" && Number.isFinite(intCompanyID)) {
      window.localStorage.setItem(AuthStorageKey.CompanyId, String(intCompanyID));
    } else {
      // Same rule as the secondary language below: a tenant switch must not retain another tenant's
      // company. Leaving a stale id here made it travel on X-Company-Id, where the server accepts it
      // ahead of the signed-in identity — scoping the new tenant's screens to a foreign company.
      window.localStorage.removeItem(AuthStorageKey.CompanyId);
    }

    if (typeof intLanguageID === "number" && Number.isFinite(intLanguageID)) {
      window.localStorage.setItem(AuthStorageKey.LanguageId, String(intLanguageID));
      window.dispatchEvent(new CustomEvent(strLanguageChangedEventName, { detail: { intLanguageID } }));
    }

    if (typeof intSecondaryLanguageID === "number" && Number.isFinite(intSecondaryLanguageID)) {
      window.localStorage.setItem(AuthStorageKey.SecondaryLanguageId, String(intSecondaryLanguageID));
    } else {
      // Tenant switches must not retain another tenant's optional secondary language.
      window.localStorage.removeItem(AuthStorageKey.SecondaryLanguageId);
    }
  },
  getTenantID() {
    if (typeof window === "undefined") {
      return null;
    }

    const strTenantID = window.localStorage.getItem(AuthStorageKey.TenantId);
    const intTenantID = Number(strTenantID);
    return Number.isFinite(intTenantID) && intTenantID > 0 ? intTenantID : null;
  },
  getCompanyID() {
    if (typeof window === "undefined") {
      return null;
    }

    const strCompanyID = window.localStorage.getItem(AuthStorageKey.CompanyId);
    const intCompanyID = Number(strCompanyID);
    return Number.isFinite(intCompanyID) && intCompanyID > 0 ? intCompanyID : null;
  },
  setLanguageID(intLanguageID?:number) {
    if (typeof window === "undefined") {
      return;
    }

    if (typeof intLanguageID === "number" && Number.isFinite(intLanguageID)) {
      window.localStorage.setItem(AuthStorageKey.LanguageId, String(intLanguageID));
      window.dispatchEvent(new CustomEvent(strLanguageChangedEventName, { detail: { intLanguageID } }));
    }
  },
  getLanguageID() {
    if (typeof window === "undefined") {
      return null;
    }

    const strLanguageID = window.localStorage.getItem(AuthStorageKey.LanguageId);
    const intLanguageID = Number(strLanguageID);
    return Number.isFinite(intLanguageID) && intLanguageID > 0 ? intLanguageID : null;
  },
  getSecondaryLanguageID() {
    if (typeof window === "undefined") {
      return null;
    }

    const strLanguageID = window.localStorage.getItem(AuthStorageKey.SecondaryLanguageId);
    const intLanguageID = Number(strLanguageID);
    return Number.isFinite(intLanguageID) && intLanguageID > 0 ? intLanguageID : null;
  },
  async clearClientCache() {
    if (typeof window === "undefined") {
      return;
    }

    clearPrefixedStorage(window.localStorage);
    clearPrefixedStorage(window.sessionStorage);

    if ("caches" in window) {
      const lstCacheKeys = await window.caches.keys();
      await Promise.all(lstCacheKeys.map((strCacheKey) => window.caches.delete(strCacheKey)));
    }

    if ("serviceWorker" in navigator) {
      const lstServiceWorkerRegistrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(lstServiceWorkerRegistrations.map((objRegistration) => objRegistration.unregister()));
    }
  },
  clearStoredSessionState() {
    if (typeof window === "undefined") {
      return;
    }

    clearPrefixedStorage(window.localStorage);
    clearPrefixedStorage(window.sessionStorage);
    window.dispatchEvent(new CustomEvent(strLanguageChangedEventName, { detail: { intLanguageID: null } }));
  },
  clearSession(blnPreserveTenantContext = false) {
    if (typeof document === "undefined") {
      return;
    }

    const strTenantUUID = this.getTenantUUID();
    if (typeof window !== "undefined") {
      this.clearStoredSessionState();
      void this.clearClientCache();
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
    // Preserve the tenant UUID cookie so the "Login again" step (and any later
    // visit to "/") returns the user to their tenant login page rather than the
    // generic email-only one.
    this.clearSession(true);
    window.location.replace(strSessionExpiredUrl);
  },
  resetSessionExpiryRedirect() {
    blnSessionExpiryRedirectInProgress = false;
  }
};
