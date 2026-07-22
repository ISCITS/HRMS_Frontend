"use client";

import { useMemo } from "react";

import { useActionRights } from "@/features/security/hooks/useActionRights";

const lstMutatingActionCodes = [
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
];

function normalizeCode(strValue: string) {
  return strValue.trim().toUpperCase().replace(/[-\s]/g, "_");
}

export function useModuleActionAccess(lstModuleHints: string[]) {
  const objActionRights = useActionRights();

  const lstResolvedModuleCodes = useMemo(() => {
    const lstKnownCodes = Object.keys(objActionRights.objRights.dicAllowedActions ?? {});
    const lstNormalizedHints = lstModuleHints.map(normalizeCode);
    const lstMatches = lstKnownCodes.filter((strModuleCode) => {
      const strNormalizedCode = normalizeCode(strModuleCode);
      const strCompactCode = strNormalizedCode.replace(/_/g, "");
      return lstNormalizedHints.some(
        (strHint) => {
          const strCompactHint = strHint.replace(/_/g, "");
          return (
            strNormalizedCode === strHint ||
            strNormalizedCode.includes(strHint) ||
            strHint.includes(strNormalizedCode) ||
            strCompactCode.includes(strCompactHint) ||
            strCompactHint.includes(strCompactCode)
          );
        },
      );
    });
    return lstMatches.length > 0 ? lstMatches : lstModuleHints;
  }, [lstModuleHints, objActionRights.objRights.dicAllowedActions]);

  function canDoAny(strActionCode: string) {
    return lstResolvedModuleCodes.some((strModuleCode) => objActionRights.canDo(strModuleCode, strActionCode));
  }

  function hasRightAny(strActionCode: string) {
    return lstResolvedModuleCodes.some((strModuleCode) => objActionRights.hasRight(strModuleCode, strActionCode));
  }

  function canViewAny() {
    return lstResolvedModuleCodes.some((strModuleCode) => objActionRights.canViewModule(strModuleCode));
  }

  function isReadOnly() {
    return canViewAny() && !lstMutatingActionCodes.some(hasRightAny);
  }

  return {
    ...objActionRights,
    lstResolvedModuleCodes,
    canDoAny,
    hasRightAny,
    canViewAny,
    isReadOnly,
  };
}
