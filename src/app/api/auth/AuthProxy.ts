import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { appConfig } from "@/config";
import { callBackendApi } from "@/lib/BackendApi";
import type {
  ApiEnvelope,
  AuthSuccessData,
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

export async function proxyTenantLookup(strTenantUUID: string) {
  return callBackendApi<ApiEnvelope<TenantLookupData>>(`/api/v1/auth/tenant/${strTenantUUID}`, {
    method: "GET",
    cache: "no-store"
  });
}

export async function proxyTenantLogin(objBody: unknown) {
  return callBackendApi<ApiEnvelope<AuthSuccessData>>("/api/v1/auth/login", {
    method: "POST",
    objJsonBody: objBody
  });
}

export async function proxyGenericLogin(objBody: unknown) {
  return callBackendApi<ApiEnvelope<AuthSuccessData>>("/api/v1/auth/login/generic", {
    method: "POST",
    objJsonBody: objBody
  });
}

export async function proxySsoRedirect(strTenantUUID: string) {
  return callBackendApi<ApiEnvelope<SsoRedirectData>>(`/api/v1/auth/sso/redirect/${strTenantUUID}`, {
    method: "GET",
    cache: "no-store"
  });
}

export async function proxySsoCallback(strSearch: string) {
  return callBackendApi<ApiEnvelope<SsoCallbackData>>(`/api/v1/auth/sso/callback${strSearch}`, {
    method: "GET",
    cache: "no-store"
  });
}

export async function proxyCurrentUser(strAccessToken: string) {
  return callBackendApi<ApiEnvelope<CurrentUserContext>>("/api/v1/auth/me", {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${strAccessToken}`
    }
  });
}

export async function proxyMenu(strAccessToken: string) {
  return callBackendApi<ApiEnvelope<MenuResponse>>("/api/v1/auth/menu", {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${strAccessToken}`
    }
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
