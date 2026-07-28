"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi } from "@/Common/utils/apiErrorHandler";

export type ReportEnvelope<TRow> = {
  lstItems: TRow[];
  intTotal: number;
  intPage: number;
  intPageSize: number;
  strScope: string;
  strMonth?: string;
};

export type LeaveBalanceRow = {
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  strDepartment: string | null;
  strLeaveType: string;
  intLeaveYear: number;
  decOpening: number;
  decEntitled: number;
  decAccrued: number;
  decCarryForward: number;
  decAdjustments: number;
  decUtilised: number;
  decHold: number;
  decLapsed: number;
  decEncashed: number;
  decAvailable: number;
  blnNegative: boolean;
  dtLastTransactionOn: string | null;
};

export type LeaveRegisterRow = {
  intID: number;
  strReference: string;
  strEmployeeCode: string;
  strEmployeeName: string;
  strLeaveType: string;
  dtFromDate: string | null;
  dtToDate: string | null;
  decDays: number;
  strStatus: string;
  dtAppliedOn: string | null;
  strCurrentApprover: string | null;
  intAgeingDays: number | null;
  strReasonSummary: string;
};

export type MonthlyAttendanceRow = {
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  strDepartment: string | null;
  intDaysRecorded: number;
  intPresent: number;
  intHalfDay: number;
  intPaidLeave: number;
  intLwp: number;
  intAbsent: number;
  intHoliday: number;
  intWeeklyOff: number;
  intOnDuty: number;
  intPaidDays: number;
  intLateMinutes: number;
  decOtHours: number;
};

export type AttendanceExceptionRow = {
  intID: number;
  dtWorkDate: string | null;
  strEmployeeCode: string;
  strEmployeeName: string;
  strExceptionType: string;
  strSeverity: string;
  strStatus: string;
  strMessage: string;
  dtDetectedOn: string | null;
  strAssignedTo: string | null;
  intAgeingDays: number | null;
  intRegularizationRequestID: number | null;
  strResolutionCode: string | null;
};

function buildQuery(dicFilters: Record<string, string | number | undefined | null>): string {
  const objParams = new URLSearchParams();
  Object.entries(dicFilters).forEach(([strKey, objValue]) => {
    if (objValue !== undefined && objValue !== null && String(objValue).trim() !== "") {
      objParams.set(strKey, String(objValue).trim());
    }
  });
  const strQuery = objParams.toString();
  return strQuery ? `?${strQuery}` : "";
}

async function getReport<TRow>(strPath: string, strMenuAction: string): Promise<ReportEnvelope<TRow>> {
  const objResult = await requestEncryptedApi<ReportEnvelope<TRow>>({
    strPath: `${ApiRoutePrefix.ApiV1}${strPath}`,
    strMethod: ApiRequestMethod.Get,
    strMenuAction,
    blnUseAuthHeader: true,
  });
  return objResult.Data;
}

// A generous single-page fetch; the grid paginates client-side (POC data volumes).
const REPORT_PAGE_SIZE = 100;

export const leaveAttendanceReportService = {
  async getLeaveBalance(dicFilters: Record<string, string | number | undefined>): Promise<ReportEnvelope<LeaveBalanceRow>> {
    const strQuery = buildQuery({ ...dicFilters, page: 1, page_size: REPORT_PAGE_SIZE });
    return getReport<LeaveBalanceRow>(`/reports/leave/balance${strQuery}`, "REPORTS_LEAVE_BALANCE");
  },
  async getLeaveRegister(dicFilters: Record<string, string | number | undefined>): Promise<ReportEnvelope<LeaveRegisterRow>> {
    const strQuery = buildQuery({ ...dicFilters, page: 1, page_size: REPORT_PAGE_SIZE });
    return getReport<LeaveRegisterRow>(`/reports/leave/applications${strQuery}`, "REPORTS_LEAVE_REGISTER");
  },
  async getMonthlyAttendance(dicFilters: Record<string, string | number | undefined>): Promise<ReportEnvelope<MonthlyAttendanceRow>> {
    const strQuery = buildQuery({ ...dicFilters, page: 1, page_size: REPORT_PAGE_SIZE });
    return getReport<MonthlyAttendanceRow>(`/reports/attendance/monthly-summary${strQuery}`, "REPORTS_ATTENDANCE_SUMMARY");
  },
  async getAttendanceExceptions(dicFilters: Record<string, string | number | undefined>): Promise<ReportEnvelope<AttendanceExceptionRow>> {
    const strQuery = buildQuery({ ...dicFilters, page: 1, page_size: REPORT_PAGE_SIZE });
    return getReport<AttendanceExceptionRow>(`/reports/attendance/exceptions${strQuery}`, "REPORTS_ATTENDANCE_EXCEPTION");
  },
};
