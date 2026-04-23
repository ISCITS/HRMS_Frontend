"use client";

import { ApiRequestMethod } from "@/Common/enums/AppEnums";
import type { ModuleLabelsResponse } from "@/features/labels/types";
import { normalizeLabelModuleName } from "@/features/labels/utils/normalizeLabelModuleName";
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
    const strResolvedModuleName = normalizeLabelModuleName(strModuleName);
    try {
      return await requestLabels({ language_id: intLanguageID, module_name: strResolvedModuleName });
    } catch (objError) {
      return {
        module: strResolvedModuleName,
        language: "en",
        fallback_language: null,
        labels: {}
      };
    }
  },

  async getModuleLabels(intLanguageID: number, strModuleName: string): Promise<ModuleLabelsResponse> {
    const strNormalizedModuleName = normalizeLabelModuleName(strModuleName);
    if (strNormalizedModuleName === "common") {
      return this.getLabels(intLanguageID, "common");
    }

    const [objModuleLabels, objCommonLabels] = await Promise.all([
      this.getLabels(intLanguageID, strModuleName),
      this.getLabels(intLanguageID, "common"),
    ]);

    return {
      ...objModuleLabels,
      labels: {
        ...(objCommonLabels.labels ?? {}),
        ...(objModuleLabels.labels ?? {}),
      },
      fallback_language: objModuleLabels.fallback_language ?? objCommonLabels.fallback_language,
      language: objModuleLabels.language ?? objCommonLabels.language,
    };
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
