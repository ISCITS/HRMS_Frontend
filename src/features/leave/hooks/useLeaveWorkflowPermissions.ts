"use client";

import { useMemo } from "react";

import { useActionRights } from "@/features/security/hooks/useActionRights";

// Mirrors the backend permission model (app/api/v1/LeaveRoutes.ensureLeaveActionAllowed):
// a leave workflow verb is allowed when the required LEAVE_* action code is granted on
// ANY leave module (module code containing "LEAVE"). approve/reject also accept LEAVE_MANAGE.
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

  function canLeave(strActionCode: string): boolean {
    return setLeaveActions.has(strActionCode.toUpperCase());
  }

  const blnCanApprove = canLeave("LEAVE_APPROVE") || canLeave("LEAVE_MANAGE");
  const blnCanReject = canLeave("LEAVE_REJECT") || canLeave("LEAVE_MANAGE");
  const blnCanSendBack = canLeave("LEAVE_SEND_BACK") || canLeave("LEAVE_MANAGE");
  const blnCanReassign = canLeave("LEAVE_REASSIGN");
  const blnCanOverride = canLeave("LEAVE_OVERRIDE");
  const blnCanView = canLeave("LEAVE_VIEW") || canLeave("LEAVE_MANAGE") || blnCanApprove;

  return {
    blnLoading,
    canLeave,
    blnCanView,
    blnCanApprove,
    blnCanReject,
    blnCanSendBack,
    blnCanReassign,
    blnCanOverride,
    blnCanViewConfidential: canLeave("LEAVE_CONFIDENTIAL_VIEW"),
    blnCanViewExceptions: canLeave("LEAVE_WORKFLOW_EXCEPTION_VIEW") || blnCanOverride,
    blnCanViewTeamCalendar: canLeave("LEAVE_TEAM_CALENDAR_VIEW") || blnCanView,
  };
}
