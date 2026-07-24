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
  "save",
];

function normalizeCode(strValue: string) {
  return strValue.trim().toUpperCase().replace(/[-\s]/g, "_");
}

function compactCode(strValue: string) {
  return normalizeCode(strValue).replace(/_/g, "");
}

export function useModuleActionAccess(lstModuleHints: string[]) {
  const objActionRights = useActionRights();

  const lstResolvedModuleCodes = useMemo(() => {
    const lstKnownCodes = Object.keys(objActionRights.objRights.dicAllowedActions ?? {});
    const lstNormalizedHints = lstModuleHints.map(normalizeCode);
    const setExactMatches = new Set(
      lstKnownCodes.filter((strModuleCode) => {
        const strNormalizedCode = normalizeCode(strModuleCode);
        const strCompactKnownCode = compactCode(strModuleCode);
        return lstNormalizedHints.some((strHint) =>
          strNormalizedCode === strHint || strCompactKnownCode === compactCode(strHint)
        );
      }),
    );
    if (setExactMatches.size > 0) {
      return Array.from(setExactMatches);
    }

    const setPrefixMatches = new Set(
      lstKnownCodes.filter((strModuleCode) => {
        const strNormalizedCode = normalizeCode(strModuleCode);
        const strCompactKnownCode = compactCode(strModuleCode);
        return lstNormalizedHints.some((strHint) => {
          const strCompactHint = compactCode(strHint);
          return (
            strNormalizedCode.startsWith(`${strHint}_`) ||
            strHint.startsWith(`${strNormalizedCode}_`) ||
            strCompactKnownCode.startsWith(strCompactHint) ||
            strCompactHint.startsWith(strCompactKnownCode)
          );
        });
      }),
    );
    return setPrefixMatches.size > 0 ? Array.from(setPrefixMatches) : lstModuleHints;
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
