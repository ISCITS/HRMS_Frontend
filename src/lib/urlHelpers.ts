import { appRoutes } from "@/config/routes";
import { authHelpers } from "@/lib/auth";
import { getBasePath, withBasePath } from "@/lib/basePath";

/*
Functional responsibility:
- Provide browser-facing (base-path-included) URLs for the handful of
  destinations reached via raw browser navigation: window.location.*, a plain
  <a>/<img>, fetch() against this app's own routes, or a manually built
  Location header.

Why this is separate from appRoutes / authHelpers.getLoginUrl / redirect():
- next/link, useRouter().push/replace and next/navigation's redirect() already
  prepend the configured Next.js basePath automatically. Wrapping those call
  sites here too would duplicate the base path. Only the raw browser-API call
  sites listed above need the explicit prefix, because those APIs know nothing
  about Next's basePath config.

Output:
- getLoginUrl/getLogoutUrl/getSessionExpiredUrl/getDashboardUrl: absolute,
  base-path-aware, root-relative URLs ready for window.location/<a>/<img>.

Failure behavior:
- Falls back to the same logical routes authHelpers/appRoutes already use when
  no tenant UUID is available, unchanged from prior behavior.
*/
export { getBasePath, withBasePath };

export function getLoginUrl(strTenantUUID?: string): string {
  return withBasePath(authHelpers.getLoginUrl(strTenantUUID));
}

export function getLogoutUrl(strTenantUUID?: string): string {
  const strResolvedTenantUUID = (strTenantUUID || authHelpers.getTenantUUID()).trim();
  const strLogoutPath = strResolvedTenantUUID
    ? `${appRoutes.logout}?tenantUuid=${encodeURIComponent(strResolvedTenantUUID)}`
    : appRoutes.logout;

  return withBasePath(strLogoutPath);
}

export function getSessionExpiredUrl(strTenantUUID?: string): string {
  return withBasePath(
    strTenantUUID
      ? `/session-expired?tenantUuid=${encodeURIComponent(strTenantUUID)}`
      : authHelpers.getSessionExpiredUrl()
  );
}

export function getDashboardUrl(): string {
  return withBasePath(appRoutes.dashboard);
}
