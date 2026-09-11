"use client";

import { useMemo } from "react";

import { useActionRights } from "@/features/security/hooks/useActionRights";

// Mirrors the backend permission model (app/api/v1/LeaveRoutes.ensureLeaveActionAllowed +
// LEAVE_GENERIC_ACTION_VERBS): a leave workflow verb is allowed when EITHER the compound
// LEAVE_* action code OR the equivalent generic menu action (view/approve/manage/...) is
// granted on ANY leave module (module code containing "LEAVE"). Leave-approval menus are
// catalogued with generic actions for some groups (HR "leave_approvals") and compound codes
// for others (ESS "ESS_LEAVE_APPROVALS"), so both must be accepted or one group is locked out.

// Compound LEAVE_* codes accepted per verb.
const COMPOUND_ACTIONS: Record<string, string[]> = {
  view: ["LEAVE_VIEW", "LEAVE_MANAGE"],
  approve: ["LEAVE_APPROVE", "LEAVE_MANAGE"],
  reject: ["LEAVE_REJECT", "LEAVE_MANAGE"],
  send_back: ["LEAVE_SEND_BACK", "LEAVE_MANAGE"],
  reassign: ["LEAVE_REASSIGN"],
  override: ["LEAVE_OVERRIDE"],
  confidential_view: ["LEAVE_CONFIDENTIAL_VIEW"],
  workflow_exception_view: ["LEAVE_WORKFLOW_EXCEPTION_VIEW"],
  team_calendar_view: ["LEAVE_TEAM_CALENDAR_VIEW"],
};

// Generic menu action verbs accepted per verb (mirrors backend LEAVE_GENERIC_ACTION_VERBS).
const GENERIC_ACTIONS: Record<string, string[]> = {
  view: ["VIEW"],
  approve: ["APPROVE", "MANAGE"],
  // APPROVE authorises reject / send-back too — one decision surface (see backend
  // LEAVE_GENERIC_ACTION_VERBS); the HR menu exposes only an Approve toggle.
  reject: ["REJECT", "MANAGE", "APPROVE"],
  send_back: ["SEND_BACK", "MANAGE", "APPROVE"],
  confidential_view: ["CONFIDENTIAL_VIEW"],
  team_calendar_view: ["TEAM_CALENDAR_VIEW", "VIEW"],
};

export function useLeaveWorkflowPermissions() {
  const { objRights, blnLoading } = useActionRights();

  const setLeaveActions = useMemo(() => {
    const setActions = new Set<string>();
    Object.entries(objRights.dicAllowedActions ?? {}).forEach(([strModuleCode, lstActions]) => {
      if (!strModuleCode.toUpperCase().includes("LEAVE")) {
        return;
      }
      (lstActions ?? []).forEach((strAction) => setActions.add(String(strAction).toUpperCase()));
    });
    return setActions;
  }, [objRights.dicAllowedActions]);

  // Exact action-code check (kept for backward compatibility).
  function canLeave(strActionCode: string): boolean {
    return setLeaveActions.has(strActionCode.toUpperCase());
  }

  // Verb check accepting both compound LEAVE_* and generic menu actions.
  function canVerb(strVerb: string): boolean {
    const lstAccepted = [...(COMPOUND_ACTIONS[strVerb] ?? []), ...(GENERIC_ACTIONS[strVerb] ?? [])];
    return lstAccepted.some((strAction) => setLeaveActions.has(strAction));
  }

  const blnCanApprove = canVerb("approve");
  const blnCanReject = canVerb("reject");
  const blnCanSendBack = canVerb("send_back");
  const blnCanReassign = canVerb("reassign");
  const blnCanOverride = canVerb("override");
  const blnCanView = canVerb("view") || blnCanApprove;

  return {
    blnLoading,
    canLeave,
    blnCanView,
    blnCanApprove,
    blnCanReject,
    blnCanSendBack,
    blnCanReassign,
    blnCanOverride,
    blnCanViewConfidential: canVerb("confidential_view"),
    blnCanViewExceptions: canVerb("workflow_exception_view") || blnCanOverride,
    blnCanViewTeamCalendar: canVerb("team_calendar_view") || blnCanView,
  };
}
