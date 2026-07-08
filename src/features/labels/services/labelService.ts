"use client";

import { ApiRequestMethod } from "@/Common/enums/AppEnums";
import type { AllLabelsResponse, ModuleLabelsResponse } from "@/features/labels/types";
import { normalizeLabelModuleName } from "@/features/labels/utils/normalizeLabelModuleName";
import { callAPI } from "@/lib/apiClient";
import { authHelpers } from "@/lib/auth";

const dicLabelRequestCache = new Map<string, Promise<ModuleLabelsResponse>>();
const dicLabelResponseCache = new Map<string, ModuleLabelsResponse>();
const dicAllLabelRequestCache = new Map<string, Promise<AllLabelsResponse>>();
const setHydratedAllLabelCache = new Set<string>();
const intPersistentCacheTtlMs = 10 * 60 * 1000;
const strPersistentCachePrefix = "hrms_label_cache:v3:";
const strPersistentAllCachePrefix = "hrms_all_label_cache:v3:";
const strLabelsRefreshedEventName = "hrms:labels-refreshed";

type PersistentLabelCacheEntry = {
  intCachedAt: number;
  objResponse: ModuleLabelsResponse;
};

type PersistentAllLabelCacheEntry = {
  intCachedAt: number;
  objResponse: AllLabelsResponse;
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

async function requestAllLabels(objPayload: { language_id: number }) {
  const objResponse = await callAPI<AllLabelsResponse>(
    null,
    "labels/all",
    "LABELS_READ",
    {
      method: ApiRequestMethod.Get,
      params: objPayload
    }
  );
  return objResponse.Response;
}

function buildLabelScopeKey(intLanguageID: number) {
  const intTenantID = authHelpers.getTenantID() ?? 0;
  const intCompanyID = authHelpers.getCompanyID() ?? 0;
  return `${intTenantID}:${intCompanyID}:${intLanguageID}`;
}

function buildLabelCacheKey(intLanguageID: number, strModuleName: string) {
  return `${buildLabelScopeKey(intLanguageID)}:${normalizeLabelModuleName(strModuleName)}`;
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

function readPersistentAllLabels(strScopeKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const strCachedValue = window.sessionStorage.getItem(`${strPersistentAllCachePrefix}${strScopeKey}`);
    if (!strCachedValue) {
      return null;
    }

    const objCachedEntry = JSON.parse(strCachedValue) as PersistentAllLabelCacheEntry;
    if (!objCachedEntry?.objResponse || Date.now() - objCachedEntry.intCachedAt > intPersistentCacheTtlMs) {
      window.sessionStorage.removeItem(`${strPersistentAllCachePrefix}${strScopeKey}`);
      return null;
    }

    return objCachedEntry.objResponse;
  } catch {
    return null;
  }
}

function writePersistentAllLabels(strScopeKey: string, objResponse: AllLabelsResponse) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const objCacheEntry: PersistentAllLabelCacheEntry = {
      intCachedAt: Date.now(),
      objResponse,
    };
    window.sessionStorage.setItem(`${strPersistentAllCachePrefix}${strScopeKey}`, JSON.stringify(objCacheEntry));
  } catch {
    // Storage can be unavailable in private browsing or under quota pressure.
  }
}

function toModuleResponse(
  strModuleName: string,
  objAllLabels: AllLabelsResponse
): ModuleLabelsResponse {
  const strResolvedModuleName = normalizeLabelModuleName(strModuleName);
  const dicCommonLabels = objAllLabels.modules.common ?? {};
  const dicModuleLabels = objAllLabels.modules[strResolvedModuleName] ?? {};
  return {
    module: strResolvedModuleName,
    language: objAllLabels.language,
    fallback_language: objAllLabels.fallback_language,
    labels: strResolvedModuleName === "common"
      ? { ...dicCommonLabels }
      : { ...dicCommonLabels, ...dicModuleLabels }
  };
}

function hydrateAllLabelCache(intLanguageID: number, objAllLabels: AllLabelsResponse) {
  const strScopeKey = buildLabelScopeKey(intLanguageID);
  const setModuleNames = new Set([
    "common",
    ...Object.keys(objAllLabels.modules ?? {}).map((strModuleName) => normalizeLabelModuleName(strModuleName)),
  ]);

  for (const strModuleName of setModuleNames) {
    const strCacheKey = buildLabelCacheKey(intLanguageID, strModuleName);
    const objModuleResponse = toModuleResponse(strModuleName, objAllLabels);
    dicLabelResponseCache.set(strCacheKey, objModuleResponse);
    writePersistentLabels(strCacheKey, objModuleResponse);
  }

  setHydratedAllLabelCache.add(strScopeKey);
}

function clearLabelScopeCache(intLanguageID: number) {
  const strScopeKey = buildLabelScopeKey(intLanguageID);
  setHydratedAllLabelCache.delete(strScopeKey);
  dicAllLabelRequestCache.delete(strScopeKey);

  for (const strCacheKey of Array.from(dicLabelResponseCache.keys())) {
    if (strCacheKey.startsWith(`${strScopeKey}:`)) {
      dicLabelResponseCache.delete(strCacheKey);
    }
  }

  for (const strCacheKey of Array.from(dicLabelRequestCache.keys())) {
    if (strCacheKey.startsWith(`${strScopeKey}:`)) {
      dicLabelRequestCache.delete(strCacheKey);
    }
  }

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(`${strPersistentAllCachePrefix}${strScopeKey}`);
    for (let intIndex = window.sessionStorage.length - 1; intIndex >= 0; intIndex -= 1) {
      const strStorageKey = window.sessionStorage.key(intIndex);
      if (strStorageKey?.startsWith(`${strPersistentCachePrefix}${strScopeKey}:`)) {
        window.sessionStorage.removeItem(strStorageKey);
      }
    }
  } catch {
    // Storage can be unavailable in private browsing or under quota pressure.
  }
}

async function ensureAllLabelsHydrated(intLanguageID: number, blnForceRefresh = false) {
  const strScopeKey = buildLabelScopeKey(intLanguageID);
  if (blnForceRefresh) {
    clearLabelScopeCache(intLanguageID);
  }

  if (setHydratedAllLabelCache.has(strScopeKey)) {
    return;
  }

  const objPersistentResponse = readPersistentAllLabels(strScopeKey);
  if (objPersistentResponse) {
    hydrateAllLabelCache(intLanguageID, objPersistentResponse);
    return;
  }

  const objPendingRequest = dicAllLabelRequestCache.get(strScopeKey);
  if (objPendingRequest) {
    hydrateAllLabelCache(intLanguageID, await objPendingRequest);
    return;
  }

  const objRequest = requestAllLabels({ language_id: intLanguageID })
    .then((objResponse) => {
      writePersistentAllLabels(strScopeKey, objResponse);
      hydrateAllLabelCache(intLanguageID, objResponse);
      dicAllLabelRequestCache.delete(strScopeKey);
      return objResponse;
    })
    .catch((objError) => {
      dicAllLabelRequestCache.delete(strScopeKey);
      throw objError;
    });

  dicAllLabelRequestCache.set(strScopeKey, objRequest);
  await objRequest;
}

async function refreshAllLabelCache(intLanguageID: number) {
  await ensureAllLabelsHydrated(intLanguageID, true);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(strLabelsRefreshedEventName, {
        detail: { intLanguageID }
      })
    );
  }
}

async function getCachedLabels(intLanguageID: number, strModuleName: string) {
  const strResolvedModuleName = normalizeLabelModuleName(strModuleName);
  const strScopeKey = buildLabelScopeKey(intLanguageID);
  const strCacheKey = buildLabelCacheKey(intLanguageID, strResolvedModuleName);
  const objCachedResponse = dicLabelResponseCache.get(strCacheKey);
  if (objCachedResponse && setHydratedAllLabelCache.has(strScopeKey)) {
    return objCachedResponse;
  }

  try {
    await ensureAllLabelsHydrated(intLanguageID);
    const objHydratedResponse = dicLabelResponseCache.get(strCacheKey);
    if (objHydratedResponse) {
      return objHydratedResponse;
    }
  } catch {
    // Fall back to the legacy per-module endpoint if the bulk endpoint is unavailable.
  }

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
  },

  async preloadAllLabels(intLanguageID: number): Promise<void> {
    await ensureAllLabelsHydrated(intLanguageID);
  },

  async refreshAllLabels(intLanguageID: number): Promise<void> {
    await refreshAllLabelCache(intLanguageID);
  }
};
