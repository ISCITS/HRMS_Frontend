"use client";

import { useEffect, useMemo, useState } from "react";

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
      try {
        const objResult = await authApiService.getActionRights();
        if (!blnMounted) {
          return;
        }
        setObjRights(objResult.Data);
      } catch (objError) {
        if (!blnMounted) {
          return;
        }
        setStrError(objError instanceof Error ? objError.message : "Unable to load action rights.");
        setObjRights({
          dicAllowedActions: {},
          dicAccessScopeByAction: {},
        });
      } finally {
        if (blnMounted) {
          setBlnLoading(false);
        }
      }
    }

    loadRights().catch(() => undefined);

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

  function canDo(strModuleCode: string, strActionCode: string) {
    const lstAllowedActions = dicNormalizedActions[normalizeModuleCode(strModuleCode)] ?? [];
    return lstAllowedActions.includes(normalizeActionCode(strActionCode));
  }

  function canViewModule(strModuleCode: string) {
    return canDo(strModuleCode, "view");
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
    canDo,
    canViewModule,
    isReadOnlyModule,
    getAccessScope,
  };
}
