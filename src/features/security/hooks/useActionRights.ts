"use client";

import { useEffect, useMemo, useState } from "react";

import { runFrontendAction } from "@/Common/utils/apiErrorHandler";
import type { ActionRightsResponse } from "@/models/AuthModels";
import { authApiService } from "@/services/auth/AuthApiService";

function normalizeModuleCode(strModuleCode: string) {
  return strModuleCode.trim().toUpperCase().replace(/[-\s]/g, "_");
}

function normalizeActionCode(strActionCode: string) {
  return strActionCode.trim().toLowerCase();
}

export function useActionRights() {
  const [objRights, setObjRights] = useState<ActionRightsResponse>({
    dicAllowedActions: {},
    dicAccessScopeByAction: {},
  });
  
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState<string | null>(null);

  useEffect(() => {
    let blnMounted = true;

    async function loadRights() {
      setBlnLoading(true);
      setStrError(null);
      await runFrontendAction({
        fnAction: () => authApiService.getActionRights(),
        fnOnSuccess: (objResult) => {
          if (!blnMounted) {
            return;
          }
          setObjRights({
            dicAllowedActions: objResult.Data.dicAllowedActions ?? {},
            dicAccessScopeByAction: objResult.Data.dicAccessScopeByAction ?? {},
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
      ["add", "edit", "delete", "approve", "submit", "export"].includes(strActionCode),
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
