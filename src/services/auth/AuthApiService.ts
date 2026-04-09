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
  type MenuResponse,
  type ResendOtpRequest,
  type SsoRedirectData,
  type TenantAuthDetails,
  type TenantLookupData,
  type VerifyOtpRequest
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
    if (!isOtpChallengeData(objResult.Data)) {
      authHelpers.setAuthenticatedSession(objResult.Data.objToken.strAccessToken, objResult.Data.objTenant.strTenantUUID);
      authHelpers.setTenantContext(
        objResult.Data.objTenant.intTenantID,
        undefined,
        objResult.Data.objTenant.intLanguageID,
        objResult.Data.objTenant.intSecondaryLanguageID ?? undefined
      );
      authHelpers.setLanguageID(objResult.Data.objTenant.intLanguageID);
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
    if (!isOtpChallengeData(objResult.Data)) {
      authHelpers.setAuthenticatedSession(objResult.Data.objToken.strAccessToken, objResult.Data.objTenant.strTenantUUID);
      authHelpers.setTenantContext(
        objResult.Data.objTenant.intTenantID,
        undefined,
        objResult.Data.objTenant.intLanguageID,
        objResult.Data.objTenant.intSecondaryLanguageID ?? undefined
      );
      authHelpers.setLanguageID(objResult.Data.objTenant.intLanguageID);
    }
    return objResult;
  },

  async verifyOtp(objPayload: VerifyOtpRequest) {
    const objResult = await requestApi<AuthSuccessData>({
      strPath: "auth/verify-otp",
      strMethod: "POST",
      objBody: objPayload,
      strMenuAction: "AUTH_VERIFY_OTP"
    });
    authHelpers.setAuthenticatedSession(objResult.Data.objToken.strAccessToken, objResult.Data.objTenant.strTenantUUID);
    authHelpers.setTenantContext(
      objResult.Data.objTenant.intTenantID,
      undefined,
      objResult.Data.objTenant.intLanguageID,
      objResult.Data.objTenant.intSecondaryLanguageID ?? undefined
    );
    authHelpers.setLanguageID(objResult.Data.objTenant.intLanguageID);
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
    const objResult = await requestApi<AuthSuccessData>({
      strPath: `auth/sso/callback${strSearchParams ? `?${strSearchParams}` : ""}`,
      strMethod: "GET",
      strMenuAction: "AUTH_SSO_CALLBACK"
    });
    authHelpers.setAuthenticatedSession(objResult.Data.objToken.strAccessToken, objResult.Data.objTenant.strTenantUUID);
    authHelpers.setTenantContext(
      objResult.Data.objTenant.intTenantID,
      undefined,
      objResult.Data.objTenant.intLanguageID,
      objResult.Data.objTenant.intSecondaryLanguageID ?? undefined
    );
    authHelpers.setLanguageID(objResult.Data.objTenant.intLanguageID);
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
