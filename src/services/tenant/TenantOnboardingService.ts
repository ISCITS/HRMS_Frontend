"use client";

import axios from "axios";

import { authHelpers } from "@/lib/auth";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";
import { decryptPayload } from "@/lib/security/decryptPayload";
import type {
  TenantCodeAvailabilityResponse,
  TenantDatabaseConnectionValidationResponse,
  TenantDatabaseSchemaValidationResponse,
  TenantDatabaseValidationRequest,
  TenantExistingDatabaseOnboardingRequest,
  TenantExistingDatabaseOnboardingResponse,
  TenantOnboardingFormOptions,
  TenantOnboardingRequest,
  TenantOnboardingResponse,
} from "@/models/TenantOnboardingModels";

type ApiEnvelope<TData> = {
  ResultCode: number;
  Msg: string;
  Data: TData;
};

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: "GET" | "POST";
  objBody?: unknown;
  objQueryParams?: Record<string, string | number | boolean | null | undefined>;
  strMenuAction: string;
}): Promise<ApiEnvelope<TData>> {
  const strAccessToken = authHelpers.getAccessToken();
  const objHeaders: Record<string, string> = {};

  if (strAccessToken) {
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
    } as ApiRequestConfig);

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
      if (objResponseData && "payload" in objResponseData && objResponseData.payload) {
        const objDecryptedPayload = await decryptPayload<ApiEnvelope<TData>>(objResponseData.payload);
        throw new Error(objDecryptedPayload.Msg ?? "Request failed.");
      }
      throw new Error(objResponseData?.Msg ?? objError.message ?? "Request failed.");
    }

    throw objError;
  }
}

export const tenantOnboardingService = {
  getFormOptions() {
    return requestApi<TenantOnboardingFormOptions>({
      strPath: "/tenants/onboarding/form-options",
      strMethod: "GET",
      strMenuAction: "TENANT_ONBOARDING_FORM_OPTIONS",
    });
  },

  checkTenantCodeAvailability(strTenantCode: string) {
    return requestApi<TenantCodeAvailabilityResponse>({
      strPath: "/tenants/onboarding/check-code",
      strMethod: "GET",
      objQueryParams: { tenant_code: strTenantCode },
      strMenuAction: "TENANT_ONBOARDING_VALIDATE_CODE",
    });
  },

  createTenant(objBody: TenantOnboardingRequest) {
    return requestApi<TenantOnboardingResponse>({
      strPath: "/tenants/onboarding",
      strMethod: "POST",
      objBody,
      strMenuAction: "TENANT_ONBOARDING_CREATE",
    });
  },

  validateDatabaseConnection(objBody: TenantDatabaseValidationRequest) {
    return requestApi<TenantDatabaseConnectionValidationResponse>({
      strPath: "/tenants/onboarding/validate-db-connection",
      strMethod: "POST",
      objBody,
      strMenuAction: "TENANT_ONBOARDING_VALIDATE_DB_CONNECTION",
    });
  },

  validateDatabaseSchema(objBody: TenantDatabaseValidationRequest) {
    return requestApi<TenantDatabaseSchemaValidationResponse>({
      strPath: "/tenants/onboarding/validate-db-schema",
      strMethod: "POST",
      objBody,
      strMenuAction: "TENANT_ONBOARDING_VALIDATE_DB_SCHEMA",
    });
  },

  createTenantUsingExistingDatabase(objBody: TenantExistingDatabaseOnboardingRequest) {
    return requestApi<TenantExistingDatabaseOnboardingResponse>({
      strPath: "/tenants/onboarding/existing-database",
      strMethod: "POST",
      objBody,
      strMenuAction: "TENANT_ONBOARDING_EXISTING_DATABASE_CREATE",
    });
  },
};

