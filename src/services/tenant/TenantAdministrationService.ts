"use client";

import axios from "axios";

import { authHelpers } from "@/lib/auth";
import { axiosInstance } from "@/lib/axiosInstance";
import { encryptPassBase64 } from "@/lib/passwordEncryption";
import { decryptPayload } from "@/lib/security/decryptPayload";
import type { AuthSuccessData } from "@/models/AuthModels";
import type {
  TenantAdminDashboardCounts,
  TenantAdminLoginRequest,
  TenantAdminLoginResponse,
  TenantEditPayload,
  TenantManagementListItem,
  TenantUpdateRequest,
  TenantUpdateResponse,
} from "@/models/TenantAdministrationModels";

type ApiEnvelope<TData> = {
  ResultCode: number;
  Msg: string;
  Data: TData;
};

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: "GET" | "POST" | "PUT";
  objBody?: unknown;
  objQueryParams?: Record<string, string | number | boolean | null | undefined>;
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
      url: `api/v1${objOptions.strPath}`,
      data: objOptions.objBody,
      params: objOptions.objQueryParams,
      csrfMenuAction: objOptions.strMenuAction,
      headers: objHeaders,
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

function persistAuthenticatedSession(objAuthData: AuthSuccessData) {
  authHelpers.setAuthenticatedSession(objAuthData.objToken.strAccessToken, objAuthData.objTenant.strTenantUUID);
  authHelpers.setTenantContext(
    objAuthData.objTenant.intTenantID,
    undefined,
    objAuthData.objTenant.intLanguageID,
    objAuthData.objTenant.intSecondaryLanguageID ?? undefined,
  );
  authHelpers.setLanguageID(objAuthData.objTenant.intLanguageID);
}

export const tenantAdministrationService = {
  async login(objPayload: TenantAdminLoginRequest) {
    const objResult = await requestApi<TenantAdminLoginResponse>({
      strPath: "/tenant-admin/login",
      strMethod: "POST",
      objBody: {
        ...objPayload,
        strPassword: encryptPassBase64(objPayload.strPassword),
      },
      strMenuAction: "TENANT_ADMIN_LOGIN",
    });
    persistAuthenticatedSession(objResult.Data.objAuth);
    return objResult;
  },

  async getDashboardCounts() {
    return requestApi<TenantAdminDashboardCounts>({
      strPath: "/tenant-admin/dashboard",
      strMethod: "GET",
      strMenuAction: "TENANT_ADMIN_DASHBOARD",
      blnUseAuthHeader: true,
    });
  },

  async listTenants(objFilters?: {
    search?: string;
    status?: string;
    sortBy?: string;
    sortDirection?: string;
  }) {
    return requestApi<TenantManagementListItem[]>({
      strPath: "/tenant-admin/tenants",
      strMethod: "GET",
      objQueryParams: {
        search: objFilters?.search || undefined,
        status: objFilters?.status || undefined,
        sort_by: objFilters?.sortBy || undefined,
        sort_direction: objFilters?.sortDirection || undefined,
      },
      strMenuAction: "TENANT_ADMIN_LIST",
      blnUseAuthHeader: true,
    });
  },

  async getTenantDetail(intTenantID: number) {
    return requestApi<TenantEditPayload>({
      strPath: `/tenant-admin/tenants/${intTenantID}`,
      strMethod: "GET",
      strMenuAction: "TENANT_ADMIN_DETAIL",
      blnUseAuthHeader: true,
    });
  },

  async updateTenant(intTenantID: number, objBody: TenantUpdateRequest) {
    return requestApi<TenantUpdateResponse>({
      strPath: `/tenant-admin/tenants/${intTenantID}`,
      strMethod: "PUT",
      objBody,
      strMenuAction: "TENANT_ADMIN_UPDATE",
      blnUseAuthHeader: true,
    });
  },
};
