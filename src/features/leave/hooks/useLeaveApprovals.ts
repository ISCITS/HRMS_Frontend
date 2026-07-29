"use client";

import { useCallback, useEffect, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { leaveService } from "@/features/leave/services/leaveService";
import type { LeaveQueueItemDto, TeamCalendarDto } from "@/features/leave/types";

function fnToISODate(objDate: Date): string {
  return objDate.toISOString().slice(0, 10);
}

// Loads everything the ESS Leave Approvals dashboard needs. The actioned-by-me and
// team-calendar calls degrade to empty when the signed-in approver lacks that specific
// right (or the workflow schema is not yet deployed) so the primary queue still renders.
export function useLeaveApprovals(blnEnabled: boolean) {
  const [lstQueue, setLstQueue] = useState<LeaveQueueItemDto[]>([]);
  const [lstActioned, setLstActioned] = useState<LeaveQueueItemDto[]>([]);
  const [objTeamCalendar, setObjTeamCalendar] = useState<TeamCalendarDto | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState<string | null>(null);

  const fnLoadAll = useCallback(async () => {
    if (!blnEnabled) {
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    setStrError(null);
    const dtToday = new Date();
    const dtHorizon = new Date();
    dtHorizon.setDate(dtHorizon.getDate() + 45);
    try {
      const [lstQueueResult, lstActionedResult, objCalendarResult] = await Promise.all([
        leaveService.listApplicationQueue("pending"),
        leaveService.listActionedApplications().catch(() => [] as LeaveQueueItemDto[]),
        leaveService.getTeamCalendar(fnToISODate(dtToday), fnToISODate(dtHorizon)).catch(() => null),
      ]);
      setLstQueue(lstQueueResult);
      setLstActioned(lstActionedResult);
      setObjTeamCalendar(objCalendarResult);
    } catch (objError) {
      setStrError((await createApiRequestError(objError)).message);
    } finally {
      setBlnLoading(false);
    }
  }, [blnEnabled]);

  useEffect(() => {
    void fnLoadAll();
  }, [fnLoadAll]);

  return { lstQueue, lstActioned, objTeamCalendar, blnLoading, strError, fnLoadAll };
}
