"use client";

import type { ModuleLabelsResponse } from "@/features/labels/types";
import { callAPI } from "@/lib/apiClient";
import { encryptPayload } from "@/lib/security/encryptPayload";

export const labelService = {
  async getLabels(intLanguageID: number, strModuleName: string): Promise<ModuleLabelsResponse> {
    const objQueryPreview = { language_id: intLanguageID, module_name: strModuleName };
    console.debug("[Labels API] encrypted request", await encryptPayload(objQueryPreview));

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

      console.debug("[Labels API] raw response", objResponse.Response);
      console.debug("[Labels API] decrypted response", objResponse.Response);
      return objResponse.Response;
    } catch (objError) {
      console.error("[Labels API] request failed", {
        query: objQueryPreview,
        error: objError instanceof Error ? objError.message : objError,
      });
      throw (objError instanceof Error ? objError : new Error("Unable to load labels."));
    }
  },

  getModuleLabels(intLanguageID: number, strModuleName: string): Promise<ModuleLabelsResponse> {
    return this.getLabels(intLanguageID, strModuleName);
  }
};
