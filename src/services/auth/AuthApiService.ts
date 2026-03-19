"use client";

import axios from "axios";
import { axiosInstance } from "@/lib/axiosInstance";
import { authHelpers } from "@/lib/auth";
import { encryptPassBase64 } from "@/lib/passwordEncryption";
import { decryptPayload } from "@/lib/security/decryptPayload";
import { apiConstants } from "@/config/constants";
import { GenericLoginRequest, LoginRequest, type AuthSuccessData, type CurrentUserContext, type MenuResponse, type SsoRedirectData, type TenantLookupData } from "@/models/AuthModels";

type ApiEnvelope<TData> = {
  ResultCode: number;
  Msg: string;
  Data: TData;
};

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
    if (strAccessToken) {
      objHeaders.Authorization = `Bearer ${strAccessToken}`;
    }
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
      throw new Error(objPayload.Msg ?? "Request failed.");
    }

    return objPayload;
  } catch (objError) {
    if (axios.isAxiosError(objError)) {
      const objResponseData = objError.response?.data as ApiEnvelope<TData> | { payload?: string; Msg?: string } | undefined;
      if (objResponseData?.payload) {
        const objDecryptedPayload = await decryptPayload<ApiEnvelope<TData>>(objResponseData.payload);
        throw new Error(objDecryptedPayload.Msg ?? "Request failed.");
      }

      throw new Error(objResponseData?.Msg ?? objError.message ?? "Request failed.");
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

  async login(objPayload: LoginRequest) {
    const objRequestBody = {
      ...objPayload,
      strPassword: encryptPassBase64(objPayload.strPassword)
    };
    const objResult = await requestApi<AuthSuccessData>({
      strPath: "auth/login",
      strMethod: "POST",
      objBody: objRequestBody,
      strMenuAction: "AUTH_LOGIN"
    });
    authHelpers.setAuthenticatedSession(objResult.Data.objToken.strAccessToken, objResult.Data.objTenant.strTenantUUID);
    return objResult;
  },

  async genericLogin(objPayload: GenericLoginRequest) {
    const objRequestBody = {
      ...objPayload,
      strPassword: encryptPassBase64(objPayload.strPassword)
    };
    const objResult = await requestApi<AuthSuccessData>({
      strPath: "auth/login/generic",
      strMethod: "POST",
      objBody: objRequestBody,
      strMenuAction: "AUTH_GENERIC_LOGIN"
    });
    authHelpers.setAuthenticatedSession(objResult.Data.objToken.strAccessToken, objResult.Data.objTenant.strTenantUUID);
    return objResult;
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

  async logout() {
    const objResult = await requestApi<{ blnLoggedOut: boolean }>({
      strPath: "auth/logout",
      strMethod: "POST",
      strMenuAction: "AUTH_LOGOUT",
      blnUseAuthHeader: true
    });
    authHelpers.clearSession();
    return objResult;
  }
};
