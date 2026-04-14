"use client";

import { ApiRequestMethod } from "@/Common/enums/AppEnums";
import type { ModuleLabelsResponse } from "@/features/labels/types";
import { callAPI } from "@/lib/apiClient";

async function requestLabels(objPayload: { language_id: number; module_name: string }) {
  const objResponse = await callAPI<ModuleLabelsResponse>(
    null,
    "labels",
    "LABELS_READ",
    {
      method: ApiRequestMethod.Get,
      params: objPayload
    }
  );
  return objResponse.Response;
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
      return await requestLabels({ language_id: intLanguageID, module_name: "employee-details" });
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
