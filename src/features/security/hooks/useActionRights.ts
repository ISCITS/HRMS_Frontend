"use client";

import { useEffect, useMemo, useState } from "react";

import { runFrontendAction } from "@/Common/utils/apiErrorHandler";
import type { ActionRightsResponse } from "@/models/AuthModels";
import { authApiService } from "@/services/auth/AuthApiService";
import { authHelpers } from "@/lib/auth";

type ActionRightsCacheEntry = {
  strCacheKey: string;
  intExpiresAt: number;
  objRights: ActionRightsResponse;
};

const intActionRightsCacheTtlMs = 5 * 60 * 1000;
let objActionRightsCacheEntry: ActionRightsCacheEntry | null = null;
let objActionRightsRequest: Promise<ActionRightsResponse> | null = null;

function normalizeModuleCode(strModuleCode: string) {
  return strModuleCode.trim().toUpperCase().replace(/[-\s]/g, "_");
}

function normalizeActionCode(strActionCode: string) {
  return strActionCode.trim().toLowerCase();
}

function buildActionRightsCacheKey() {
  const strTokenTail = authHelpers.getAccessToken()?.slice(-24) ?? "";
  return [
    authHelpers.getTenantID() ?? 0,
    authHelpers.getCompanyID() ?? 0,
    strTokenTail,
  ].join(":");
}

async function getCachedActionRights() {
  const strCacheKey = buildActionRightsCacheKey();
  if (
    objActionRightsCacheEntry &&
    objActionRightsCacheEntry.strCacheKey === strCacheKey &&
    objActionRightsCacheEntry.intExpiresAt > Date.now()
  ) {
    return objActionRightsCacheEntry.objRights;
  }

  if (objActionRightsRequest) {
    return objActionRightsRequest;
  }

  objActionRightsRequest = authApiService.getActionRights()
    .then((objResult) => {
      const objRights = {
        dicAllowedActions: objResult.Data.dicAllowedActions ?? {},
        dicAccessScopeByAction: objResult.Data.dicAccessScopeByAction ?? {},
      };
      objActionRightsCacheEntry = {
        strCacheKey,
        intExpiresAt: Date.now() + intActionRightsCacheTtlMs,
        objRights,
      };
      objActionRightsRequest = null;
      return objRights;
    })
    .catch((objError) => {
      objActionRightsRequest = null;
      throw objError;
    });

  return objActionRightsRequest;
}

export function useActionRights() {
  const strInitialCacheKey = buildActionRightsCacheKey();
  const objInitialRights =
    objActionRightsCacheEntry &&
    objActionRightsCacheEntry.strCacheKey === strInitialCacheKey &&
    objActionRightsCacheEntry.intExpiresAt > Date.now()
      ? objActionRightsCacheEntry.objRights
      : {
          dicAllowedActions: {},
          dicAccessScopeByAction: {},
        };
  const [objRights, setObjRights] = useState<ActionRightsResponse>({
    dicAllowedActions: objInitialRights.dicAllowedActions,
    dicAccessScopeByAction: objInitialRights.dicAccessScopeByAction,
  });
  
  const [blnLoading, setBlnLoading] = useState(
    !objActionRightsCacheEntry ||
    objActionRightsCacheEntry.strCacheKey !== strInitialCacheKey ||
    objActionRightsCacheEntry.intExpiresAt <= Date.now()
  );
  const [strError, setStrError] = useState<string | null>(null);

  useEffect(() => {
    let blnMounted = true;

    async function loadRights() {
      const strCacheKey = buildActionRightsCacheKey();
      if (
        objActionRightsCacheEntry &&
        objActionRightsCacheEntry.strCacheKey === strCacheKey &&
        objActionRightsCacheEntry.intExpiresAt > Date.now()
      ) {
        setObjRights(objActionRightsCacheEntry.objRights);
        setBlnLoading(false);
        setStrError(null);
        return;
      }

      setBlnLoading(true);
      setStrError(null);
      await runFrontendAction({
        fnAction: getCachedActionRights,
        fnOnSuccess: (objResult) => {
          if (!blnMounted) {
            return;
          }
          setObjRights({
            dicAllowedActions: objResult.dicAllowedActions ?? {},
            dicAccessScopeByAction: objResult.dicAccessScopeByAction ?? {},
          });
        },
        fnOnError: (objError) => {
          if (!blnMounted) {
            return;
          }
          setStrError(objError.message);
          setObjRights({
            dicAllowedActions: {},
            dicAccessScopeByAction: {},
          });
        },
        fnFinally: () => {
          if (blnMounted) {
            setBlnLoading(false);
          }
        },
        strFallbackMessage: "Unable to load action rights.",
      });
    }

    void loadRights();

    return () => {
      blnMounted = false;
    };
  }, []);

  const dicNormalizedActions = useMemo(() => {
    return Object.fromEntries(
      Object.entries(objRights.dicAllowedActions).map(([strModuleCode, lstActions]) => [
        normalizeModuleCode(strModuleCode),
        lstActions.map(normalizeActionCode),
      ]),
    );
  }, [objRights.dicAllowedActions]);

  function hasRight(strModuleCode: string, strActionCode: string) {
    const strNormalizedModuleCode = normalizeModuleCode(strModuleCode);
    const strNormalizedActionCode = normalizeActionCode(strActionCode);
    const lstAllowedActions = dicNormalizedActions[strNormalizedModuleCode] ?? [];
    return lstAllowedActions.includes(strNormalizedActionCode);
  }

  function canDo(strModuleCode: string, strActionCode: string) {
    return hasRight(strModuleCode, strActionCode);
  }

  function canViewModule(strModuleCode: string) {
    const strNormalizedModuleCode = normalizeModuleCode(strModuleCode);
    const lstAllowedActions = dicNormalizedActions[strNormalizedModuleCode] ?? [];
    return lstAllowedActions.includes("view");
  }

  function isReadOnlyModule(strModuleCode: string) {
    const lstAllowedActions = dicNormalizedActions[normalizeModuleCode(strModuleCode)] ?? [];
    return lstAllowedActions.includes("view") && !lstAllowedActions.some((strActionCode) =>
      [
        "add",
        "create",
        "edit",
        "delete",
        "approve",
        "reject",
        "submit",
        "cancel",
        "disburse",
        "manual_recovery",
        "skip_installment",
        "adjust_schedule",
        "close",
        "export",
      ].includes(strActionCode),
    );
  }

  function getAccessScope(strModuleCode: string, strActionCode: string) {
    return (
      objRights.dicAccessScopeByAction[
        `${normalizeModuleCode(strModuleCode)}:${normalizeActionCode(strActionCode)}`
      ] ?? null
    );
  }

  return {
    blnLoading,
    strError,
    objRights,
    hasRight,
    canDo,
    canViewModule,
    isReadOnlyModule,
    getAccessScope,
  };
}
