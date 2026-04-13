"use client";

import { AuthStorageKey, DefaultContextValue } from "@/Common/enums/AppEnums";
import type { ModuleLabelsResponse } from "@/features/labels/types";
import { authHelpers } from "@/lib/auth";
import { decryptPayload } from "@/lib/security/decryptPayload";

function getLabelRequestHeaders() {
  const strAccessToken = authHelpers.getAccessToken();
  const strTenantID =
    typeof window !== "undefined"
      ? window.localStorage.getItem(AuthStorageKey.TenantId)?.trim() || DefaultContextValue.PrimaryId
      : DefaultContextValue.PrimaryId;
  const strCompanyID =
    typeof window !== "undefined"
      ? window.localStorage.getItem(AuthStorageKey.CompanyId)?.trim() || DefaultContextValue.PrimaryId
      : DefaultContextValue.PrimaryId;

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(strAccessToken ? { Authorization: `Bearer ${strAccessToken}`, "X-Access-Token": strAccessToken } : {}),
    "X-Tenant-Id": strTenantID,
    "X-Company-Id": strCompanyID
  };
}

async function requestLabels(objPayload: { language_id: number; module_name: string }) {
  const objResponse = await fetch("/api/labels", {
    method: "POST",
    headers: getLabelRequestHeaders(),
    body: JSON.stringify(objPayload),
    cache: "no-store"
  });

  const objRawResult = (await objResponse.json().catch(() => ({}))) as
    | ModuleLabelsResponse
    | { payload?: string; message?: string };
  const objResult =
    typeof objRawResult === "object" &&
    objRawResult !== null &&
    "payload" in objRawResult &&
    typeof objRawResult.payload === "string"
      ? await decryptPayload<ModuleLabelsResponse>(objRawResult.payload)
      : objRawResult;

  if (!objResponse.ok) {
    throw new Error(("message" in objRawResult ? objRawResult.message : undefined) ?? "Unable to load labels.");
  }

  return objResult;
}

export const labelService = {
  async getLabels(intLanguageID: number, strModuleName: string): Promise<ModuleLabelsResponse> {
    try {
      return await requestLabels({ language_id: intLanguageID, module_name: strModuleName });
    } catch (objError) {
      return {
        module: strModuleName,
        language: "en",
        fallback_language: null,
        labels: {}
      };
    }
  },

  getModuleLabels(intLanguageID: number, strModuleName: string): Promise<ModuleLabelsResponse> {
    return this.getLabels(intLanguageID, strModuleName);
  },

  async getPayrollCycleLabels(intLanguageID: number): Promise<ModuleLabelsResponse> {
    try {
      return await requestLabels({ language_id: intLanguageID, module_name: "payroll-cycles" });
    } catch (objError) {
      return {
        module: "payroll-cycles",
        language: "en",
        fallback_language: null,
        labels: {}
      };
    }
  },

  async getEmployeeDetailsLabels(intLanguageID: number): Promise<ModuleLabelsResponse> {
    try {
      const objResponse = await callAPI<ModuleLabelsResponse>(
        null,
        "labels/employee-details",
        "MASTER_EMPLOYEE_LABELS",
        {
          method: "GET",
          params: { language_id: intLanguageID },
        }
      );
      return objResponse.Response;
    } catch (objError) {
      return {
        module: "employee",
        language: "en",
        fallback_language: null,
        labels: {}
      };
    }
  },

  async getTaxRegimeLabels(intLanguageID: number): Promise<ModuleLabelsResponse> {
    try {
      return await requestLabels({ language_id: intLanguageID, module_name: "tax-regimes" });
    } catch (objError) {
      return {
        module: "tax-regimes",
        language: "en",
        fallback_language: null,
        labels: {}
      };
    }
  },

  async getPayrollProcessLogLabels(intLanguageID: number): Promise<ModuleLabelsResponse> {
    try {
      return await requestLabels({ language_id: intLanguageID, module_name: "payroll-process-logs" });
    } catch (objError) {
      return {
        module: "payroll-process-logs",
        language: "en",
        fallback_language: null,
        labels: {}
      };
    }
  }
};
