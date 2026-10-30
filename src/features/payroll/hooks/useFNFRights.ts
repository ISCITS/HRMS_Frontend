"use client";

import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

const lstFNFModuleCodes = ["PAYROLL_FNF_SETTLEMENTS", "PAYROLL_FNF", "FNF_SETTLEMENTS"];

/** F&F actions granted in User Group Rights on the Full and Final Settlement menu. They match the
 * backend checks in FNFSettlementRoutes.ensureFNFActionAllowed. */
export type FNFAction = "view" | "add" | "edit" | "calculate" | "approve" | "release" | "lock" | "mark_paid" | "cancel" | "export";

const dicActionAliases: Partial<Record<FNFAction, string[]>> = {
  add: ["add", "create"],
};

export function useFNFRights() {
  const objAccess = useModuleActionAccess(lstFNFModuleCodes);

  function can(strAction: FNFAction) {
    const lstCodes = dicActionAliases[strAction] ?? [strAction];
    // Older setups granted payroll_fnf_<action> codes; they still count.
    return lstCodes.some((strCode) => objAccess.canDoAny(strCode) || objAccess.canDoAny(`payroll_fnf_${strCode}`));
  }

  function canView() {
    return objAccess.canViewAny() || can("view");
  }

  return { ...objAccess, can, canView };
}
