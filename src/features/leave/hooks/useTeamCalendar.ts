"use client";

import { useCallback, useEffect, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { employeeCalendarService } from "@/features/employee-calendar/services/employeeCalendarService";
import type { EmployeeCalendarData } from "@/features/employee-calendar/types/EmployeeCalendarTypes";
import { leaveService } from "@/features/leave/services/leaveService";
import type { TeamCalendarDto } from "@/features/leave/types";

export type CalendarDateMeta = { blnHoliday: boolean; strHolidayName: string | null; blnWeeklyOff: boolean };

// Holidays and weekly-offs are not part of the team-calendar payload, so they are overlaid
// from the manager's own /ess/employee-calendar (company holidays are org-wide; the manager's
// roster is a reasonable default weekly-off indicator for the team view).
function fnBuildDateMeta(objCalendar: EmployeeCalendarData | null): Record<string, CalendarDateMeta> {
  const dicMeta: Record<string, CalendarDateMeta> = {};
  (objCalendar?.lstDays ?? []).forEach((objDay) => {
    const objHoliday = objDay.lstEvents.find((objEvent) => objEvent.strEventType === "holiday");
    const blnWeeklyOff =
      objDay.lstEvents.some((objEvent) => objEvent.strEventType === "roster" && /off/i.test(objEvent.strStatus ?? "")) ||
      /week.?off|weekly_off/i.test(objDay.strPrimaryStatus ?? "");
    dicMeta[objDay.dtDate] = { blnHoliday: Boolean(objHoliday), strHolidayName: objHoliday?.strLabel ?? null, blnWeeklyOff };
  });
  return dicMeta;
}

export function useTeamCalendar(strFromDate: string, strToDate: string, blnEnabled: boolean) {
  const [objTeamCalendar, setObjTeamCalendar] = useState<TeamCalendarDto | null>(null);
  const [dicDateMeta, setDicDateMeta] = useState<Record<string, CalendarDateMeta>>({});
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState<string | null>(null);

  const fnLoad = useCallback(async () => {
    if (!blnEnabled || !strFromDate || !strToDate) {
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    setStrError(null);
    try {
      const [objTeam, objSelf] = await Promise.all([
        leaveService.getTeamCalendar(strFromDate, strToDate),
        employeeCalendarService.getCalendar(strFromDate, strToDate).catch(() => null),
      ]);
      setObjTeamCalendar(objTeam);
      setDicDateMeta(fnBuildDateMeta(objSelf));
    } catch (objError) {
      setStrError((await createApiRequestError(objError)).message);
    } finally {
      setBlnLoading(false);
    }
  }, [strFromDate, strToDate, blnEnabled]);

  useEffect(() => {
    void fnLoad();
  }, [fnLoad]);

  return { objTeamCalendar, dicDateMeta, blnLoading, strError, fnLoad };
}
