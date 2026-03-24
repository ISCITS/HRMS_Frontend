"use client";

import type { ModuleLabelsResponse } from "@/features/labels/types";
import { callAPI } from "@/lib/apiClient";

export const labelService = {
  async getLabels(intLanguageID: number, strModuleName: string): Promise<ModuleLabelsResponse> {
    const objQueryPreview = { language_id: intLanguageID, module_name: strModuleName };

    try {
      const objResponse = await callAPI<ModuleLabelsResponse>(
        null,
        "/api/v1/labels",
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
  }
};
