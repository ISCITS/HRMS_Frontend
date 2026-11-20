"use client";

import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

// Menu employee_separations (docs/apply_employee_separation.sql). Module-level so the hook's memo is stable.
const lstSeparationModuleCodes = ["EMPLOYEE_SEPARATIONS", "EMPLOYEE_SEPARATION"];

/** Employee Separation actions granted in User Group Rights. They match the backend checks in
 * EmployeeSeparationRoutes.ensureSeparationActionAllowed. */
export type SeparationAction = "view" | "add" | "cancel" | "export";

export function useSeparationRights() {
  const objAccess = useModuleActionAccess(lstSeparationModuleCodes);

  function can(strAction: SeparationAction) {
    const lstCodes = strAction === "add" ? ["add", "create"] : [strAction];
    return lstCodes.some((strCode) => objAccess.canDoAny(strCode));
  }

  function canView() {
    return objAccess.canViewAny() || can("view");
  }

  return { ...objAccess, can, canView };
}
