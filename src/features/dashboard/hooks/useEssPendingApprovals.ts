"use client";

import { useEffect, useState } from "react";

import { attendanceRegularizationService } from "@/features/attendance-regularization/services/attendanceRegularizationService";
import { leaveService } from "@/features/leave/services/leaveService";
import { useLeaveWorkflowPermissions } from "@/features/leave/hooks/useLeaveWorkflowPermissions";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

// Powers the "pending approvals" quick-action badges on the ESS dashboard's Attendance
// Today and Leave Balance cards. Each count is only fetched when the signed-in employee
// actually holds the corresponding approver right (i.e. is a line manager for that
// workflow) so individual contributors never pay for or see these calls.
export function useEssPendingApprovals() {
  const { blnCanView: blnIsLeaveApprover, blnLoading: blnLeaveRightsLoading } = useLeaveWorkflowPermissions();
  const { canViewAny, blnLoading: blnRegularizationRightsLoading } = useModuleActionAccess([
    "ESS_ATTENDANCE_REGULARIZATION_APPROVALS",
  ]);
  const blnIsRegularizationApprover = canViewAny();

  const [intPendingLeaveApprovals, setIntPendingLeaveApprovals] = useState(0);
  const [intPendingRegularizationApprovals, setIntPendingRegularizationApprovals] = useState(0);
  const [blnLoading, setBlnLoading] = useState(true);

  useEffect(() => {
    if (blnLeaveRightsLoading || blnRegularizationRightsLoading) {
      return;
    }
    let blnMounted = true;
    setBlnLoading(true);
    Promise.all([
      blnIsLeaveApprover
        ? leaveService.listApplicationQueue("pending").then((lstQueue) => lstQueue.length).catch(() => 0)
        : Promise.resolve(0),
      blnIsRegularizationApprover
        ? attendanceRegularizationService
            .listManagerRequests({ intPage: 1, intPageSize: 1, strStatus: "PENDING_APPROVAL" })
            .then((objResult) => Number(objResult.intTotal || 0))
            .catch(() => 0)
        : Promise.resolve(0),
    ]).then(([intLeaveCount, intRegularizationCount]) => {
      if (!blnMounted) {
        return;
      }
      setIntPendingLeaveApprovals(intLeaveCount);
      setIntPendingRegularizationApprovals(intRegularizationCount);
      setBlnLoading(false);
    });
    return () => {
      blnMounted = false;
    };
  }, [blnIsLeaveApprover, blnIsRegularizationApprover, blnLeaveRightsLoading, blnRegularizationRightsLoading]);

  return {
    blnIsLeaveApprover,
    blnIsRegularizationApprover,
    intPendingLeaveApprovals,
    intPendingRegularizationApprovals,
    intTotalPendingApprovals: intPendingLeaveApprovals + intPendingRegularizationApprovals,
    blnLoading,
  };
}
