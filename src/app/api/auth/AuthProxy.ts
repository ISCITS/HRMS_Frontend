import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { DefaultContextValue } from "@/Common/enums/AppEnums";
import { appConfig } from "@/config";
import { apiConstants } from "@/config/constants";
import { callBackendApi } from "@/lib/BackendApi";
import { generateCSRFToken } from "@/lib/csrfToken";
import { getServerAppOrigin, getServerCsrfSecretKey, shouldUseSecureAuthCookies } from "@/lib/serverSecurity";
import type {
  ApiEnvelope,
  ActionRightsResponse,
  AuthSuccessData,
  GoogleMfaChallengeData,
  CurrentUserContext,
  MenuResponse,
  PortalContextData,
  SsoCallbackData,
  SsoRedirectData,
  TenantLookupData
} from "@/models/AuthModels";

function getAuthCookieStore() {
  return cookies();
}

export function isAuthSuccessData(objData: unknown): objData is AuthSuccessData {
  return Boolean(
    objData &&
    typeof objData === "object" &&
    "objToken" in objData &&
    "objTenant" in objData
  );
}

export async function getAccessTokenFromCookie() {
  const objCookieStore = await getAuthCookieStore();
  return objCookieStore.get(appConfig.authCookieName)?.value ?? "";
}

export function getAccessTokenFromRequest(objRequest: Request) {
  const strAuthorization = objRequest.headers.get("Authorization") ?? "";
  if (strAuthorization.startsWith("Bearer ")) {
    return strAuthorization.slice("Bearer ".length).trim();
  }

  return objRequest.headers.get("X-Access-Token")?.trim() ?? "";
}

export async function setAuthCookies(objResponse: NextResponse, objAuthData: AuthSuccessData) {
  const intMaxAgeSeconds = appConfig.authCookieMaxAgeSeconds;
  const blnSecureCookie = shouldUseSecureAuthCookies();

  objResponse.cookies.set(appConfig.authCookieName, objAuthData.objToken.strAccessToken, {
    httpOnly: true,
    path: "/",
    maxAge: intMaxAgeSeconds,
    sameSite: "lax",
    secure: blnSecureCookie
  });
  objResponse.cookies.set(appConfig.tenantCookieName, objAuthData.objTenant.strTenantUUID, {
    httpOnly: false,
    path: "/",
    maxAge: intMaxAgeSeconds,
    sameSite: "lax",
    secure: blnSecureCookie
  });
}

// Refreshes only the access-token cookie. Switching portal keeps the same session and tenant, so
// the tenant cookie is deliberately left untouched.
export async function setAccessTokenCookie(objResponse: NextResponse, strAccessToken: string) {
  objResponse.cookies.set(appConfig.authCookieName, strAccessToken, {
    httpOnly: true,
    path: "/",
    maxAge: appConfig.authCookieMaxAgeSeconds,
    sameSite: "lax",
    secure: shouldUseSecureAuthCookies()
  });
}

export async function clearAuthCookies(objResponse: NextResponse) {
  objResponse.cookies.set(appConfig.authCookieName, "", { path: "/", maxAge: 0 });
  objResponse.cookies.set(appConfig.tenantCookieName, "", { path: "/", maxAge: 0 });
}

function buildPublicProxyHeaders(strMenuAction: string) {
  const strFrontendOrigin = getServerAppOrigin();

  return {
    Origin: strFrontendOrigin,
    [apiConstants.csrfHeaderName]: generateCSRFToken(getServerCsrfSecretKey(), strMenuAction),
    "X-Tenant-Id": DefaultContextValue.PrimaryId,
    "X-Company-Id": DefaultContextValue.PrimaryId,
  };
}

export async function proxyTenantLookup(strTenantUUID: string) {
  return callBackendApi<ApiEnvelope<TenantLookupData>>("/api/v1/tenant", {
    method: "POST",
    cache: "no-store",
    objJsonBody: { strTenantUUID },
    headers: buildPublicProxyHeaders("AUTH_TENANT_LOOKUP")
  });
}

export async function proxyTenantLookupPayload(objBody: unknown) {
  return callBackendApi<ApiEnvelope<TenantLookupData>>("/api/v1/tenant", {
    method: "POST",
    cache: "no-store",
    objJsonBody: objBody,
    headers: buildPublicProxyHeaders("AUTH_TENANT_LOOKUP")
  });
}

export async function proxyTenantLogin(objBody: unknown) {
  return callBackendApi<ApiEnvelope<AuthSuccessData>>("/api/v1/auth/login", {
    method: "POST",
    objJsonBody: objBody,
    headers: buildPublicProxyHeaders("AUTH_LOGIN")
  });
}

export async function proxyGenericLogin(objBody: unknown) {
  return callBackendApi<ApiEnvelope<AuthSuccessData>>("/api/v1/auth/login/generic", {
    method: "POST",
    objJsonBody: objBody,
    headers: buildPublicProxyHeaders("AUTH_GENERIC_LOGIN")
  });
}

export async function proxyVerifyOtp(objBody: unknown) {
  return callBackendApi<ApiEnvelope<AuthSuccessData | GoogleMfaChallengeData>>("/api/v1/auth/verify-otp", {
    method: "POST",
    objJsonBody: objBody,
    headers: buildPublicProxyHeaders("AUTH_VERIFY_OTP")
  });
}

export async function proxySsoRedirect(strTenantUUID: string) {
  return callBackendApi<ApiEnvelope<SsoRedirectData>>("/api/v1/auth/sso/redirect", {
    method: "POST",
    cache: "no-store",
    objJsonBody: { strTenantUUID },
    headers: buildPublicProxyHeaders("AUTH_SSO_REDIRECT")
  });
}

export async function proxySsoCallback(strSearch: string) {
  return callBackendApi<ApiEnvelope<SsoCallbackData>>(`/api/v1/auth/sso/callback${strSearch}`, {
    method: "GET",
    cache: "no-store"
  });
}

function buildProtectedProxyHeaders(strAccessToken: string, strMenuAction: string, objRequestHeaders?: Headers) {
  const strFrontendOrigin = getServerAppOrigin();
  const strTenantID = objRequestHeaders?.get("X-Tenant-Id")?.trim() || "";
  const strCompanyID = objRequestHeaders?.get("X-Company-Id")?.trim() || "";

  return {
    Authorization: `Bearer ${strAccessToken}`,
    Origin: strFrontendOrigin,
    [apiConstants.csrfHeaderName]: generateCSRFToken(getServerCsrfSecretKey(), strMenuAction),
    ...(strTenantID ? { "X-Tenant-Id": strTenantID } : {}),
    ...(strCompanyID ? { "X-Company-Id": strCompanyID } : {}),
  };
}

export function buildProtectedProxyRequestHeaders(
  strAccessToken: string,
  strMenuAction: string,
  objRequestHeaders?: Headers
) {
  return buildProtectedProxyHeaders(strAccessToken, strMenuAction, objRequestHeaders);
}

export async function proxyCurrentUser(
  strAccessToken: string,
  objRequestHeaders?: Headers,
  intLanguageID?: number | null
) {
  const strQuery = Number.isFinite(intLanguageID) && Number(intLanguageID) > 0
    ? `?language_id=${encodeURIComponent(String(intLanguageID))}`
    : "";

  return callBackendApi<ApiEnvelope<CurrentUserContext>>(`/api/v1/auth/me${strQuery}`, {
    method: "GET",
    cache: "no-store",
    headers: buildProtectedProxyHeaders(strAccessToken, "AUTH_ME", objRequestHeaders)
  });
}

export async function proxyMenu(
  strAccessToken: string,
  objRequestHeaders?: Headers,
  intLanguageID?: number | null
) {
  const strQuery = Number.isFinite(intLanguageID) && Number(intLanguageID) > 0
    ? `?language_id=${encodeURIComponent(String(intLanguageID))}`
    : "";

  return callBackendApi<ApiEnvelope<MenuResponse>>(`/api/v1/auth/menu${strQuery}`, {
    method: "GET",
    cache: "no-store",
    headers: buildProtectedProxyHeaders(strAccessToken, "AUTH_MENU", objRequestHeaders)
  });
}

export async function proxyActionRights(strAccessToken: string, objRequestHeaders?: Headers) {
  return callBackendApi<ApiEnvelope<ActionRightsResponse>>("/api/v1/auth/action-rights", {
    method: "GET",
    cache: "no-store",
    headers: buildProtectedProxyHeaders(strAccessToken, "AUTH_ACTION_RIGHTS", objRequestHeaders)
  });
}

// Activates ESS or HRMS for the signed-in identity. The backend revalidates the choice and
// re-issues the access token carrying the new active context.
export async function proxyPortalContext(
  strAccessToken: string,
  strPortal: string,
  objRequestHeaders?: Headers
) {
  return callBackendApi<ApiEnvelope<PortalContextData>>("/api/v1/auth/context", {
    method: "POST",
    cache: "no-store",
    body: JSON.stringify({ strPortal }),
    headers: buildProtectedProxyHeaders(strAccessToken, "AUTH_PORTAL_CONTEXT", objRequestHeaders)
  });
}

export async function proxyLogout(strAccessToken: string, objRequestHeaders?: Headers) {
  return callBackendApi<ApiEnvelope<{ blnLoggedOut: boolean }>>("/api/v1/auth/logout", {
    method: "POST",
    headers: buildProtectedProxyHeaders(strAccessToken, "AUTH_LOGOUT", objRequestHeaders)
  });
}




export async function proxyResendOtp(objBody: unknown) {
  return callBackendApi<ApiEnvelope<AuthSuccessData | GoogleMfaChallengeData>>("/api/v1/auth/resend-otp", {
    method: "POST",
    objJsonBody: objBody,
    headers: buildPublicProxyHeaders("AUTH_RESEND_OTP")
  });
}
