"use client";

import {
  ApiRequestMethod,
  ApiResultCode,
  ApiRoutePrefix,
  AuthStorageKey,
  DefaultContextValue
} from "@/Common/enums/AppEnums";
import { ApiRequestError, requestEncryptedApi, resolveErrorMessage } from "@/Common/utils/apiErrorHandler";
import { authHelpers } from "@/lib/auth";
import { encryptPassBase64 } from "@/lib/passwordEncryption";
import { decryptPayload } from "@/lib/security/decryptPayload";
import type { ModuleLabelsResponse } from "@/features/labels/types";
import {
  GenericLoginRequest,
  LoginRequest,
  type ActionRightsResponse,
  type AuthLoginData,
  type AuthOtpChallengeData,
  type AuthSuccessData,
  type CurrentUserContext,
  type GoogleMfaChallengeData,
  type MenuResponse,
  type ResendOtpRequest,
  type SsoCallbackData,
  type SsoMfaBackupCodeVerifyRequest,
  type SsoMfaChallengeData,
  type SsoMfaLoginSuccessData,
  type SsoMfaSetupSuccessData,
  type SsoMfaVerifyRequest,
  type SsoRedirectData,
  type TenantAuthDetails,
  type TenantLookupData,
  type VerifyOtpRequest,
  type VerifyOtpResponseData
} from "@/models/AuthModels";

export class clsApiRequestError extends ApiRequestError {}
export { resolveErrorMessage };

export function isOtpChallengeData(objData: AuthLoginData): objData is AuthOtpChallengeData {
  return "blnRequiresOtp" in objData && objData.blnRequiresOtp === true;
}

export function isGoogleMfaChallengeData(objData: unknown): objData is GoogleMfaChallengeData {
  return Boolean(
    objData &&
    typeof objData === "object" &&
    "blnMfaRequired" in objData &&
    (objData as { blnMfaRequired?: boolean }).blnMfaRequired === true
  );
}

export function isSsoMfaChallengeData(objData: SsoCallbackData): objData is SsoMfaChallengeData {
  return isGoogleMfaChallengeData(objData);
}

async function requestLocalEnvelope<TData>(strPath: string): Promise<ApiEnvelope<TData>> {
  return requestLocalEnvelopeWithBody<TData>(strPath);
}

function getLocalProxyHeaders(strAccessToken: string) {
  if (typeof window === "undefined") {
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(strAccessToken ? { Authorization: `Bearer ${strAccessToken}`, "X-Access-Token": strAccessToken } : {})
    };
  }

  const strTenantID = window.localStorage.getItem(AuthStorageKey.TenantId)?.trim() || DefaultContextValue.PrimaryId;
  const strCompanyID = window.localStorage.getItem(AuthStorageKey.CompanyId)?.trim() || DefaultContextValue.PrimaryId;

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(strAccessToken ? { Authorization: `Bearer ${strAccessToken}`, "X-Access-Token": strAccessToken } : {}),
    "X-Tenant-Id": strTenantID,
    "X-Company-Id": strCompanyID
  };
}

async function requestLocalEnvelopeWithBody<TData>(strPath: string, objBody?: unknown): Promise<ApiEnvelope<TData>> {
  async function executeRequest() {
    const strAccessToken = typeof window !== "undefined" ? authHelpers.getAccessToken() : "";
    const objResponse = await fetch(strPath, {
      method: "POST",
      headers: getLocalProxyHeaders(strAccessToken),
      cache: "no-store",
      body: objBody === undefined ? undefined : JSON.stringify(objBody)
    });

    const objRawPayload = (await objResponse.json().catch(() => ({}))) as
      | ApiEnvelope<TData>
      | { payload?: string; message?: string; Msg?: string; Data?: unknown };
    const objPayload =
      typeof objRawPayload === "object" &&
      objRawPayload !== null &&
      "payload" in objRawPayload &&
      typeof objRawPayload.payload === "string"
        ? await decryptPayload<ApiEnvelope<TData>>(objRawPayload.payload)
        : objRawPayload;

    if (!objResponse.ok || objPayload.ResultCode !== ApiResultCode.Success) {
      throw new clsApiRequestError(
        objPayload.Msg ?? ("message" in objRawPayload ? objRawPayload.message : undefined) ?? "Request failed.",
        "Data" in objPayload ? objPayload.Data : undefined,
        objResponse.status
      );
    }

    return objPayload;
  }

  try {
    return await executeRequest();
  } catch (objError) {
    if (
      objError instanceof clsApiRequestError &&
      objError.intStatusCode === 401 &&
      typeof window !== "undefined" &&
      authHelpers.getAccessToken()
    ) {
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      return executeRequest();
    }

    throw objError;
  }
}

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: ApiRequestMethod;
  objBody?: unknown;
  strMenuAction: string;
  blnUseAuthHeader?: boolean;
}) {
  try {
    return await requestEncryptedApi<TData>({
      strPath: `${ApiRoutePrefix.ApiV1}/${objOptions.strPath}`,
      strMethod: objOptions.strMethod,
      objBody: objOptions.objBody,
      strMenuAction: objOptions.strMenuAction,
      blnUseAuthHeader: objOptions.blnUseAuthHeader
    });
  } catch (objError) {
    if (objError instanceof ApiRequestError) {
      throw new clsApiRequestError(objError.message, objError.objData, objError.intStatusCode);
    }

    throw objError;
  }
}

function persistAuthenticatedSession(objAuthData: AuthSuccessData) {
  authHelpers.setAuthenticatedSession(objAuthData.objToken.strAccessToken, objAuthData.objTenant.strTenantUUID);
  authHelpers.setTenantContext(
    objAuthData.objTenant.intTenantID,
    undefined,
    objAuthData.objTenant.intLanguageID,
    objAuthData.objTenant.intSecondaryLanguageID ?? undefined
  );
  authHelpers.setLanguageID(objAuthData.objTenant.intLanguageID);
}

function deriveTenantAuthDetails(objTenant: TenantLookupData, objLabels?: ModuleLabelsResponse): TenantAuthDetails {
  const lstNormalizedAuthModes = Array.isArray(objTenant.lstAuthModes)
    ? objTenant.lstAuthModes.map((strMode) => String(strMode).trim().toLowerCase())
    : [];
  const blnSsoEnabled = objTenant.blnSsoEnabled || lstNormalizedAuthModes.includes("sso");
  const strLoginMethod = lstNormalizedAuthModes.includes("login_id") ? "login_id" : "email_address";

  return {
    tenant_id: objTenant.intTenantID,
    tenant_uuid: objTenant.strTenantUUID,
    language_id: objTenant.intLanguageID ?? null,
    is_active: true,
    auth_mode: blnSsoEnabled ? "SSO" : "LOCAL",
    login_method: blnSsoEnabled ? "sso" : strLoginMethod,
    labels: objLabels?.labels ?? {}
  };
}

export const authApiService = {
  async getTenant(strTenantUUID: string) {
    return requestApi<TenantLookupData>({
      strPath: "auth/tenant",
      strMethod: ApiRequestMethod.Post,
      objBody: { strTenantUUID },
      strMenuAction: "AUTH_TENANT_LOOKUP"
    });
  },

  async getTenantAuthDetails(strTenantUUID: string) {
    try {
      return await requestLocalEnvelopeWithBody<TenantAuthDetails>(
        "/api/tenant/auth-details",
        { strTenantUUID }
      );
    } catch (objError) {
      if (!(objError instanceof clsApiRequestError) || ![400, 404, 422].includes(objError.intStatusCode)) {
        throw objError;
      }

      const [objTenantResult, objLabelResult] = await Promise.all([
        this.getTenant(strTenantUUID),
        this.getLoginLabels(strTenantUUID).catch(() => ({
          ResultCode: ApiResultCode.Success,
          Msg: "Fallback login labels loaded.",
          Data: { module: "login", language: "en", labels: {} }
        }))
      ]);

      return {
        ResultCode: ApiResultCode.Success,
        Msg: "Tenant authentication details fetched successfully.",
        Data: deriveTenantAuthDetails(objTenantResult.Data, objLabelResult.Data)
      };
    }
  },

  async getLoginLabels(strTenantUUID: string) {
    return requestLocalEnvelopeWithBody<ModuleLabelsResponse>(
      "/api/tenant/login-labels",
      { strTenantUUID }
    );
  },

  async login(objPayload: LoginRequest) {
    const objRequestBody = {
      ...objPayload,
      strPassword: encryptPassBase64(objPayload.strPassword)
    };
    const objResult = await requestApi<AuthLoginData>({
      strPath: "auth/login",
      strMethod: ApiRequestMethod.Post,
      objBody: objRequestBody,
      strMenuAction: "AUTH_LOGIN"
    });
    if (!isOtpChallengeData(objResult.Data) && !isGoogleMfaChallengeData(objResult.Data)) {
      persistAuthenticatedSession(objResult.Data);
    }
    return objResult;
  },

  async genericLogin(objPayload: GenericLoginRequest) {
    const objRequestBody = {
      ...objPayload,
      strPassword: encryptPassBase64(objPayload.strPassword)
    };
    const objResult = await requestApi<AuthLoginData>({
      strPath: "auth/login/generic",
      strMethod: ApiRequestMethod.Post,
      objBody: objRequestBody,
      strMenuAction: "AUTH_GENERIC_LOGIN"
    });
    if (!isOtpChallengeData(objResult.Data) && !isGoogleMfaChallengeData(objResult.Data)) {
      persistAuthenticatedSession(objResult.Data);
    }
    return objResult;
  },

  async verifyOtp(objPayload: VerifyOtpRequest) {
    const objResult = await requestApi<VerifyOtpResponseData>({
      strPath: "auth/verify-otp",
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: "AUTH_VERIFY_OTP"
    });
    if (!isGoogleMfaChallengeData(objResult.Data)) {
      persistAuthenticatedSession(objResult.Data);
    }
    return objResult;
  },

  async resendOtp(objPayload: ResendOtpRequest) {
    return requestApi<{ blnOtpResent: boolean }>({
      strPath: "auth/resend-otp",
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: "AUTH_RESEND_OTP"
    });
  },

  async getSsoRedirect(strTenantUUID: string) {
    return requestApi<SsoRedirectData>({
      strPath: "auth/sso/redirect",
      strMethod: ApiRequestMethod.Post,
      objBody: { strTenantUUID },
      strMenuAction: "AUTH_SSO_REDIRECT"
    });
  },

  async completeSsoCallback(strSearchParams: string) {
    const objResult = await requestApi<SsoCallbackData>({
      strPath: `auth/sso/callback${strSearchParams ? `?${strSearchParams}` : ""}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: "AUTH_SSO_CALLBACK"
    });
    if (!isSsoMfaChallengeData(objResult.Data) && !isOtpChallengeData(objResult.Data)) {
      persistAuthenticatedSession(objResult.Data);
    }
    return objResult;
  },

  async verifySsoMfaSetup(objPayload: SsoMfaVerifyRequest) {
    const objResult = await requestApi<SsoMfaSetupSuccessData>({
      strPath: "auth/sso/mfa/setup/verify",
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: "AUTH_SSO_MFA_SETUP_VERIFY"
    });
    persistAuthenticatedSession(objResult.Data.objAuth);
    return objResult;
  },

  async verifySsoMfa(objPayload: SsoMfaVerifyRequest) {
    const objResult = await requestApi<SsoMfaLoginSuccessData>({
      strPath: "auth/sso/mfa/verify",
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: "AUTH_SSO_MFA_VERIFY"
    });
    persistAuthenticatedSession(objResult.Data.objAuth);
    return objResult;
  },

  async verifySsoBackupCode(objPayload: SsoMfaBackupCodeVerifyRequest) {
    const objResult = await requestApi<SsoMfaLoginSuccessData>({
      strPath: "auth/sso/mfa/backup-code/verify",
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: "AUTH_SSO_MFA_BACKUP_CODE_VERIFY"
    });
    persistAuthenticatedSession(objResult.Data.objAuth);
    return objResult;
  },

  async getCurrentUser() {
    return requestLocalEnvelope<CurrentUserContext>("/api/auth/me");
  },

  async getMenu() {
    return requestLocalEnvelope<MenuResponse>("/api/auth/menu");
  },

  async getActionRights() {
    return requestLocalEnvelope<ActionRightsResponse>("/api/auth/action-rights");
  },

  async logout() {
    const objResult = await requestApi<{ blnLoggedOut: boolean }>({
      strPath: "auth/logout",
      strMethod: ApiRequestMethod.Post,
      strMenuAction: "AUTH_LOGOUT",
      blnUseAuthHeader: true
    });
    await authHelpers.clearClientCache();
    authHelpers.clearSession(true);
    return objResult;
  }
};

