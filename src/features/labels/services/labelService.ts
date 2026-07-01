"use client";

import { ApiRequestMethod } from "@/Common/enums/AppEnums";
import type { ModuleLabelsResponse } from "@/features/labels/types";
import { normalizeLabelModuleName } from "@/features/labels/utils/normalizeLabelModuleName";
import { callAPI } from "@/lib/apiClient";
import { authHelpers } from "@/lib/auth";

const dicLabelRequestCache = new Map<string, Promise<ModuleLabelsResponse>>();
const dicLabelResponseCache = new Map<string, ModuleLabelsResponse>();
const intPersistentCacheTtlMs = 10 * 60 * 1000;
const strPersistentCachePrefix = "hrms_label_cache:";

type PersistentLabelCacheEntry = {
  intCachedAt: number;
  objResponse: ModuleLabelsResponse;
};

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

function buildLabelCacheKey(intLanguageID: number, strModuleName: string) {
  const intTenantID = authHelpers.getTenantID() ?? 0;
  const intCompanyID = authHelpers.getCompanyID() ?? 0;
  return `${intTenantID}:${intCompanyID}:${intLanguageID}:${normalizeLabelModuleName(strModuleName)}`;
}

function readPersistentLabels(strCacheKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const strCachedValue = window.sessionStorage.getItem(`${strPersistentCachePrefix}${strCacheKey}`);
    if (!strCachedValue) {
      return null;
    }

    const objCachedEntry = JSON.parse(strCachedValue) as PersistentLabelCacheEntry;
    if (!objCachedEntry?.objResponse || Date.now() - objCachedEntry.intCachedAt > intPersistentCacheTtlMs) {
      window.sessionStorage.removeItem(`${strPersistentCachePrefix}${strCacheKey}`);
      return null;
    }

    return objCachedEntry.objResponse;
  } catch {
    return null;
  }
}

function writePersistentLabels(strCacheKey: string, objResponse: ModuleLabelsResponse) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const objCacheEntry: PersistentLabelCacheEntry = {
      intCachedAt: Date.now(),
      objResponse,
    };
    window.sessionStorage.setItem(`${strPersistentCachePrefix}${strCacheKey}`, JSON.stringify(objCacheEntry));
  } catch {
    // Storage can be unavailable in private browsing or under quota pressure.
  }
}

async function getCachedLabels(intLanguageID: number, strModuleName: string) {
  const strResolvedModuleName = normalizeLabelModuleName(strModuleName);
  const strCacheKey = buildLabelCacheKey(intLanguageID, strResolvedModuleName);
  const objCachedResponse = dicLabelResponseCache.get(strCacheKey);
  if (objCachedResponse) {
    return objCachedResponse;
  }

  const objPersistentResponse = readPersistentLabels(strCacheKey);
  if (objPersistentResponse) {
    dicLabelResponseCache.set(strCacheKey, objPersistentResponse);
    return objPersistentResponse;
  }

  const objPendingRequest = dicLabelRequestCache.get(strCacheKey);
  if (objPendingRequest) {
    return objPendingRequest;
  }

  const objRequest = requestLabels({ language_id: intLanguageID, module_name: strResolvedModuleName })
    .then((objResponse) => {
      dicLabelResponseCache.set(strCacheKey, objResponse);
      writePersistentLabels(strCacheKey, objResponse);
      dicLabelRequestCache.delete(strCacheKey);
      return objResponse;
    })
    .catch(() => {
      const objFallbackResponse: ModuleLabelsResponse = {
        module: strResolvedModuleName,
        language: "en",
        fallback_language: null,
        labels: {}
      };
      dicLabelRequestCache.delete(strCacheKey);
      return objFallbackResponse;
    });

  dicLabelRequestCache.set(strCacheKey, objRequest);
  return objRequest;
}

export const labelService = {
  async getLabels(intLanguageID: number, strModuleName: string): Promise<ModuleLabelsResponse> {
    return getCachedLabels(intLanguageID, strModuleName);
  },

  async getModuleLabels(intLanguageID: number, strModuleName: string): Promise<ModuleLabelsResponse> {
    const strNormalizedModuleName = normalizeLabelModuleName(strModuleName);
    if (strNormalizedModuleName === "common") {
      return this.getLabels(intLanguageID, "common");
    }

    return this.getLabels(intLanguageID, strModuleName);
  },

  async getPayrollCycleLabels(intLanguageID: number): Promise<ModuleLabelsResponse> {
    return getCachedLabels(intLanguageID, "payroll-cycles");
  },

  async getEmployeeDetailsLabels(intLanguageID: number): Promise<ModuleLabelsResponse> {
    return getCachedLabels(intLanguageID, "employee-details");
  },

  async getTaxRegimeLabels(intLanguageID: number): Promise<ModuleLabelsResponse> {
    return getCachedLabels(intLanguageID, "tax-regimes");
  },

  async getPayrollProcessLogLabels(intLanguageID: number): Promise<ModuleLabelsResponse> {
    return getCachedLabels(intLanguageID, "payroll-process-logs");
  }
};
