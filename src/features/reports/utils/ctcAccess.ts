import type { ActionRightsResponse } from "@/models/AuthModels";

export function hasCtcAction(rights: ActionRightsResponse | null | undefined, action: string): boolean {
  return Object.entries(rights?.dicAllowedActions ?? {}).some(([module, actions]) =>
    ["EMPLOYEE_SALARY", "EMPLOYEE_SALARIES"].includes(module.trim().toUpperCase().replace(/[- ]/g, "_"))
    && actions.includes(action)
    && ["all", "self", "team"].includes(rights?.dicAccessScopeByAction?.[`${module}:${action}`] ?? "none"));
}
