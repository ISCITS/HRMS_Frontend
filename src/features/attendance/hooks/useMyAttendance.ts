"use client";

import { useCallback, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { attendanceService } from "@/features/attendance/services/attendanceService";
import type {
  MyAttendanceHistory,
  MyAttendanceOverview,
} from "@/features/attendance/types/MyAttendanceTypes";
import type { MyShiftDto } from "@/features/attendance/dto";

export function useMyAttendance() {
  const [objOverview, setObjOverview] = useState<MyAttendanceOverview | null>(null);
  const [objHistory, setObjHistory] = useState<MyAttendanceHistory | null>(null);
  const [objShift, setObjShift] = useState<MyShiftDto | null>(null);
  const [blnLoading, setBlnLoading] = useState(false);
  const [blnPunching, setBlnPunching] = useState(false);
  const [strError, setStrError] = useState("");

  const loadAttendance = useCallback(async (
    strDate: string,
    strFromDate: string,
    strToDate: string,
    intEmployeeID?: number,
  ) => {
    setBlnLoading(true);
    setStrError("");
    try {
      const [objOverviewResult, objHistoryResult, objShiftResult] = await Promise.all([
        attendanceService.getMyAttendanceOverview(strDate, intEmployeeID),
        attendanceService.getMyAttendanceHistory(strFromDate, strToDate, intEmployeeID),
        attendanceService.getMyShift(intEmployeeID),
      ]);
      setObjOverview(objOverviewResult);
      setObjHistory(objHistoryResult);
      setObjShift(objShiftResult);
    } catch (objError) {
      const objHandledError = await createApiRequestError(objError);
      setStrError(objHandledError.message);
    } finally {
      setBlnLoading(false);
    }
  }, []);

  const punch = useCallback(async (strDirection: "in" | "out") => {
    setBlnPunching(true);
    setStrError("");
    try {
      const objResult = await attendanceService.punch({
        strDirection,
        strSource: "web",
      });
      setObjOverview(objResult);
      return objResult;
    } catch (objError) {
      const objHandledError = await createApiRequestError(objError);
      setStrError(objHandledError.message);
      throw objHandledError;
    } finally {
      setBlnPunching(false);
    }
  }, []);

  return {
    objOverview,
    objHistory,
    objShift,
    blnLoading,
    blnPunching,
    strError,
    loadAttendance,
    punch,
  };
}
