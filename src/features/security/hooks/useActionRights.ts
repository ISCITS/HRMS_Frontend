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

// Keep action-rights effectively uncached so user-group right changes
// are reflected immediately across ESS and admin flows.
const intActionRightsCacheTtlMs = 0;
let objActionRightsCacheEntry: ActionRightsCacheEntry | null = null;
let objActionRightsRequest: Promise<ActionRightsResponse> | null = null;

function normalizeModuleCode(strModuleCode: string) {
  return strModuleCode.trim().toUpperCase().replace(/[-\s]/g, "_");
}

function normalizeActionCode(strActionCode: string) {
  return strActionCode.trim().toLowerCase();
}

function compactModuleCode(strModuleCode: string) {
  return normalizeModuleCode(strModuleCode).replace(/_/g, "");
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
    intActionRightsCacheTtlMs > 0 &&
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
    intActionRightsCacheTtlMs > 0 &&
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
    intActionRightsCacheTtlMs <= 0 ||
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
        intActionRightsCacheTtlMs > 0 &&
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
    const strCompactModuleCode = compactModuleCode(strModuleCode);
    const strNormalizedActionCode = normalizeActionCode(strActionCode);
    const lstAllowedActions =
      dicNormalizedActions[strNormalizedModuleCode] ??
      Object.entries(dicNormalizedActions).find(
        ([strKnownModuleCode]) => compactModuleCode(strKnownModuleCode) === strCompactModuleCode,
      )?.[1] ??
      [];
    return lstAllowedActions.includes(strNormalizedActionCode);
  }

  function canDo(strModuleCode: string, strActionCode: string) {
    return hasRight(strModuleCode, strActionCode);
  }

  function canViewModule(strModuleCode: string) {
    const strNormalizedModuleCode = normalizeModuleCode(strModuleCode);
    const strCompactModuleCode = compactModuleCode(strModuleCode);
    const lstAllowedActions =
      dicNormalizedActions[strNormalizedModuleCode] ??
      Object.entries(dicNormalizedActions).find(
        ([strKnownModuleCode]) => compactModuleCode(strKnownModuleCode) === strCompactModuleCode,
      )?.[1] ??
      [];
    // Dynamic-menu visibility is based on the presence of an effective action.
    // Treat the same condition as page visibility so legacy groups that have
    // edit/add/export but no explicitly persisted VIEW right are not shown a
    // menu item that opens an access-denied screen.
    return lstAllowedActions.length > 0;
  }

  function isReadOnlyModule(strModuleCode: string) {
    const strNormalizedModuleCode = normalizeModuleCode(strModuleCode);
    const strCompactModuleCode = compactModuleCode(strModuleCode);
    const lstAllowedActions =
      dicNormalizedActions[strNormalizedModuleCode] ??
      Object.entries(dicNormalizedActions).find(
        ([strKnownModuleCode]) => compactModuleCode(strKnownModuleCode) === strCompactModuleCode,
      )?.[1] ??
      [];
    return lstAllowedActions.length > 0 && !lstAllowedActions.some((strActionCode) =>
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
