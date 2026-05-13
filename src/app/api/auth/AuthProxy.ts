import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { DefaultContextValue } from "@/Common/enums/AppEnums";
import { appConfig } from "@/config";
import { apiConstants } from "@/config/constants";
import { callBackendApi } from "@/lib/BackendApi";
import { generateCSRFToken } from "@/lib/csrfToken";
import type {
  ApiEnvelope,
  ActionRightsResponse,
  AuthSuccessData,
  GoogleMfaChallengeData,
  CurrentUserContext,
  MenuResponse,
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

  objResponse.cookies.set(appConfig.authCookieName, objAuthData.objToken.strAccessToken, {
    httpOnly: true,
    path: "/",
    maxAge: intMaxAgeSeconds,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
  objResponse.cookies.set(appConfig.tenantCookieName, objAuthData.objTenant.strTenantUUID, {
    httpOnly: false,
    path: "/",
    maxAge: intMaxAgeSeconds,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}

export async function clearAuthCookies(objResponse: NextResponse) {
  objResponse.cookies.set(appConfig.authCookieName, "", { path: "/", maxAge: 0 });
  objResponse.cookies.set(appConfig.tenantCookieName, "", { path: "/", maxAge: 0 });
}

function buildPublicProxyHeaders(strMenuAction: string) {
  const strFrontendOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim() || "http://localhost:3000";

  return {
    Origin: strFrontendOrigin,
    [apiConstants.csrfHeaderName]: generateCSRFToken(apiConstants.csrfSecretKey, strMenuAction),
    "X-Tenant-Id": DefaultContextValue.PrimaryId,
    "X-Company-Id": DefaultContextValue.PrimaryId,
  };
}

export async function proxyTenantLookup(strTenantUUID: string) {
  return callBackendApi<ApiEnvelope<TenantLookupData>>("/api/v1/auth/tenant", {
    method: "POST",
    cache: "no-store",
    objJsonBody: { strTenantUUID },
    headers: buildPublicProxyHeaders("AUTH_TENANT_LOOKUP")
  });
}

export async function proxyTenantLookupPayload(objBody: unknown) {
  return callBackendApi<ApiEnvelope<TenantLookupData>>("/api/v1/auth/tenant", {
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
  const strFrontendOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim() || "http://localhost:3000";
  const strTenantID = objRequestHeaders?.get("X-Tenant-Id")?.trim() || DefaultContextValue.PrimaryId;
  const strCompanyID = objRequestHeaders?.get("X-Company-Id")?.trim() || DefaultContextValue.PrimaryId;

  return {
    Authorization: `Bearer ${strAccessToken}`,
    Origin: strFrontendOrigin,
    [apiConstants.csrfHeaderName]: generateCSRFToken(apiConstants.csrfSecretKey, strMenuAction),
    "X-Tenant-Id": strTenantID,
    "X-Company-Id": strCompanyID,
  };
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

export async function proxyLogout(strAccessToken: string) {
  return callBackendApi<ApiEnvelope<{ blnLoggedOut: boolean }>>("/api/v1/auth/logout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${strAccessToken}`
    }
  });
}
