"use client";

import type { ModuleLabelsResponse } from "@/features/labels/types";
import { callAPI } from "@/lib/apiClient";

export const labelService = {
  async getLabels(intLanguageID: number, strModuleName: string): Promise<ModuleLabelsResponse> {
    const objQueryPreview = { language_id: intLanguageID, module_name: strModuleName };

    try {
      const objResponse = await callAPI<ModuleLabelsResponse>(
        null,
        "labels",
        "MASTER_EMPLOYEE_LABELS",
        {
          method: "GET",
          params: objQueryPreview,
        }
      );
      return objResponse.Response;
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
      const objResponse = await callAPI<ModuleLabelsResponse>(
        null,
        "labels/payroll-cycles",
        "MASTER_EMPLOYEE_LABELS",
        {
          method: "GET",
          params: { language_id: intLanguageID },
        }
      );
      return objResponse.Response;
    } catch (objError) {
      return {
        module: "payroll-cycles",
        language: "en",
        fallback_language: null,
        labels: {}
      };
    }
  },

  async getTaxRegimeLabels(intLanguageID: number): Promise<ModuleLabelsResponse> {
    try {
      const objResponse = await callAPI<ModuleLabelsResponse>(
        null,
        "labels/tax-regimes",
        "MASTER_EMPLOYEE_LABELS",
        {
          method: "GET",
          params: { language_id: intLanguageID },
        }
      );
      return objResponse.Response;
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
      const objResponse = await callAPI<ModuleLabelsResponse>(
        null,
        "labels/payroll-process-logs",
        "MASTER_EMPLOYEE_LABELS",
        {
          method: "GET",
          params: { language_id: intLanguageID },
        }
      );
      return objResponse.Response;
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
