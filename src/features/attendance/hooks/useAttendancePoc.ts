"use client";

import { useCallback, useEffect, useState } from "react";
import { attendanceService } from "@/features/attendance/services/attendanceService";
import type { AttendancePolicy, AttendancePolicyFormValues, AttendancePolicyList, DailyAttendanceBulkResult, DailyAttendanceRow, DailyAttendanceSaveRow } from "@/features/attendance/types";

export function useAttendancePoc(blnLoadPolicies = true) {
  const [objPolicyList, setObjPolicyList] = useState<AttendancePolicyList>({ lstItems: [], intTotal: 0, intPage: 1, intPageSize: 10 });
  const [lstDailyRows, setLstDailyRows] = useState<DailyAttendanceRow[]>([]);
  const [blnLoading, setBlnLoading] = useState(false);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");

  const loadPolicies = useCallback(async (objFilters: { strSearch?: string; blnIsActive?: boolean; intPage: number; intPageSize: number }) => {
    setBlnLoading(true); setStrError("");
    try { setObjPolicyList(await attendanceService.listPolicies(objFilters)); }
    catch (objError) { setStrError(objError instanceof Error ? objError.message : "Unable to load attendance policies."); }
    finally { setBlnLoading(false); }
  }, []);

  useEffect(() => {
    if (blnLoadPolicies) void loadPolicies({ intPage: 1, intPageSize: 10 });
  }, [blnLoadPolicies, loadPolicies]);

  async function getPolicy(intPolicyID: number) { return attendanceService.getPolicy(intPolicyID); }
  async function savePolicy(intPolicyID: number | null, objValues: AttendancePolicyFormValues): Promise<AttendancePolicy> {
    setBlnSaving(true); try { return await attendanceService.savePolicy(intPolicyID, objValues); } finally { setBlnSaving(false); }
  }
  async function setPolicyStatus(intPolicyID: number, blnIsActive: boolean) {
    setBlnSaving(true); try { return await attendanceService.setPolicyStatus(intPolicyID, blnIsActive); } finally { setBlnSaving(false); }
  }
  async function loadDaily(objFilters: { strDate: string; intDepartmentID?: number; intLocationID?: number; strSearch?: string }) {
    setBlnLoading(true); setStrError("");
    try { const lstRows = await attendanceService.loadDaily(objFilters); setLstDailyRows(lstRows); return lstRows; }
    catch (objError) { setStrError(objError instanceof Error ? objError.message : "Unable to load daily attendance."); throw objError; }
    finally { setBlnLoading(false); }
  }
  async function saveDaily(strDate: string, lstRows: DailyAttendanceSaveRow[]): Promise<DailyAttendanceBulkResult> {
    setBlnSaving(true); try { return await attendanceService.bulkSaveDaily(strDate, lstRows); } finally { setBlnSaving(false); }
  }
  return { objPolicyList, lstDailyRows, blnLoading, blnSaving, strError, loadPolicies, getPolicy, savePolicy, setPolicyStatus, loadDaily, saveDaily };
}
