"use client";

import axios from "axios";
import { axiosInstance } from "@/lib/axiosInstance";
import { authHelpers } from "@/lib/auth";
import { encryptPassBase64 } from "@/lib/passwordEncryption";
import { decryptPayload } from "@/lib/security/decryptPayload";
import { apiConstants } from "@/config/constants";
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

type ApiEnvelope<TData> = {
  ResultCode: number;
  Msg: string;
  Data: TData;
};

export class clsApiRequestError extends Error {
  objData?: unknown;
  intStatusCode?: number;

  constructor(strMessage: string, objData?: unknown, intStatusCode?: number) {
    super(strMessage);
    this.name = "clsApiRequestError";
    this.objData = objData;
    this.intStatusCode = intStatusCode;
  }
}

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

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: "GET" | "POST";
  objBody?: unknown;
  strMenuAction: string;
  blnUseAuthHeader?: boolean;
}): Promise<ApiEnvelope<TData>> {
  const objHeaders: Record<string, string> = {};

  if (objOptions.blnUseAuthHeader) {
    const strAccessToken = authHelpers.getAccessToken();
    if (!strAccessToken) {
      throw new Error("Unauthorized");
    }

    objHeaders.Authorization = `Bearer ${strAccessToken}`;
  }

  try {
    const objResponse = await axiosInstance.request({
      method: objOptions.strMethod,
      url: `${apiConstants.apiPrefix}/${objOptions.strPath}`,
      data: objOptions.objBody,
      csrfMenuAction: objOptions.strMenuAction,
      headers: objHeaders
    });

    const objRawPayload = objResponse.data as ApiEnvelope<TData> | { payload: string };
    const objPayload = "payload" in objRawPayload
      ? await decryptPayload<ApiEnvelope<TData>>(objRawPayload.payload)
      : objRawPayload;

    if (objPayload.ResultCode !== 1) {
      throw new clsApiRequestError(objPayload.Msg ?? "Request failed.", objPayload.Data);
    }

    return objPayload;
  } catch (objError) {
    if (axios.isAxiosError(objError)) {
      const objResponseData = objError.response?.data as ApiEnvelope<TData> | { payload?: string; Msg?: string } | undefined;
      if (objResponseData?.payload) {
        const objDecryptedPayload = await decryptPayload<ApiEnvelope<TData>>(objResponseData.payload);
        throw new clsApiRequestError(objDecryptedPayload.Msg ?? "Request failed.", objDecryptedPayload.Data, objError.response?.status);
      }

      throw new clsApiRequestError(objResponseData?.Msg ?? objError.message ?? "Request failed.", undefined, objError.response?.status);
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

export const authApiService = {
  async getTenant(strTenantUUID: string) {
    return requestApi<TenantLookupData>({
      strPath: `auth/tenant/${strTenantUUID}`,
      strMethod: "GET",
      strMenuAction: "AUTH_TENANT_LOOKUP"
    });
  },

  async getTenantAuthDetails(strTenantUUID: string) {
    return requestApi<TenantAuthDetails>({
      strPath: `tenant/${strTenantUUID}/auth-details`,
      strMethod: "GET",
      strMenuAction: "AUTH_TENANT_DETAILS"
    });
  },

  async getLoginLabels(strTenantUUID: string) {
    return requestApi<ModuleLabelsResponse>({
      strPath: `tenant/${strTenantUUID}/login-labels`,
      strMethod: "GET",
      strMenuAction: "AUTH_LOGIN_LABELS"
    });
  },

  async login(objPayload: LoginRequest) {
    const objRequestBody = {
      ...objPayload,
      strPassword: encryptPassBase64(objPayload.strPassword)
    };
    const objResult = await requestApi<AuthLoginData>({
      strPath: "auth/login",
      strMethod: "POST",
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
      strMethod: "POST",
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
      strMethod: "POST",
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
      strMethod: "POST",
      objBody: objPayload,
      strMenuAction: "AUTH_RESEND_OTP"
    });
  },

  async getSsoRedirect(strTenantUUID: string) {
    return requestApi<SsoRedirectData>({
      strPath: `auth/sso/redirect/${strTenantUUID}`,
      strMethod: "GET",
      strMenuAction: "AUTH_SSO_REDIRECT"
    });
  },

  async completeSsoCallback(strSearchParams: string) {
    const objResult = await requestApi<SsoCallbackData>({
      strPath: `auth/sso/callback${strSearchParams ? `?${strSearchParams}` : ""}`,
      strMethod: "GET",
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
      strMethod: "POST",
      objBody: objPayload,
      strMenuAction: "AUTH_SSO_MFA_SETUP_VERIFY"
    });
    persistAuthenticatedSession(objResult.Data.objAuth);
    return objResult;
  },

  async verifySsoMfa(objPayload: SsoMfaVerifyRequest) {
    const objResult = await requestApi<SsoMfaLoginSuccessData>({
      strPath: "auth/sso/mfa/verify",
      strMethod: "POST",
      objBody: objPayload,
      strMenuAction: "AUTH_SSO_MFA_VERIFY"
    });
    persistAuthenticatedSession(objResult.Data.objAuth);
    return objResult;
  },

  async verifySsoBackupCode(objPayload: SsoMfaBackupCodeVerifyRequest) {
    const objResult = await requestApi<SsoMfaLoginSuccessData>({
      strPath: "auth/sso/mfa/backup-code/verify",
      strMethod: "POST",
      objBody: objPayload,
      strMenuAction: "AUTH_SSO_MFA_BACKUP_CODE_VERIFY"
    });
    persistAuthenticatedSession(objResult.Data.objAuth);
    return objResult;
  },

  async getCurrentUser() {
    return requestApi<CurrentUserContext>({
      strPath: "auth/me",
      strMethod: "GET",
      strMenuAction: "AUTH_ME",
      blnUseAuthHeader: true
    });
  },

  async getMenu() {
    return requestApi<MenuResponse>({
      strPath: "auth/menu",
      strMethod: "GET",
      strMenuAction: "AUTH_MENU",
      blnUseAuthHeader: true
    });
  },

  async getActionRights() {
    return requestApi<ActionRightsResponse>({
      strPath: "auth/action-rights",
      strMethod: "GET",
      strMenuAction: "AUTH_ACTION_RIGHTS",
      blnUseAuthHeader: true
    });
  },

  async logout() {
    const objResult = await requestApi<{ blnLoggedOut: boolean }>({
      strPath: "auth/logout",
      strMethod: "POST",
      strMenuAction: "AUTH_LOGOUT",
      blnUseAuthHeader: true
    });
    authHelpers.clearSession(true);
    return objResult;
  }
};

