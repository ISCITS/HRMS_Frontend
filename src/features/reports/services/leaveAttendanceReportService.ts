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
  intLeaveTypeID: number;
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

// The backend caps page_size at 100; the grid paginates client-side.
const REPORT_PAGE_SIZE = 100;
// Remaining pages are fetched a few at a time instead of one after another.
const REPORT_PAGE_CONCURRENCY = 4;

/**
 * Fetches every page so the grid and the Excel export hold all matching rows (fetching only page 1
 * silently dropped everything after the first 100 rows).
 */
async function getAllPages<TRow>(
  strPath: string,
  dicFilters: Record<string, string | number | undefined>,
  strMenuAction: string,
): Promise<ReportEnvelope<TRow>> {
  const fnFetchPage = (intPage: number) => getReport<TRow>(
    `${strPath}${buildQuery({ ...dicFilters, page: intPage, page_size: REPORT_PAGE_SIZE })}`,
    strMenuAction,
  );
  const objFirst = await fnFetchPage(1);
  const lstItems = [...objFirst.lstItems];
  const intPages = Math.ceil((objFirst.intTotal || 0) / REPORT_PAGE_SIZE);
  for (let intStart = 2; intStart <= intPages; intStart += REPORT_PAGE_CONCURRENCY) {
    const lstPageNumbers = Array.from(
      { length: Math.min(REPORT_PAGE_CONCURRENCY, intPages - intStart + 1) },
      (_, intIndex) => intStart + intIndex,
    );
    const lstPages = await Promise.all(lstPageNumbers.map(fnFetchPage));
    lstPages.forEach((objPage) => lstItems.push(...objPage.lstItems));
  }
  return { ...objFirst, lstItems, intPage: 1, intPageSize: lstItems.length };
}

export const leaveAttendanceReportService = {
  async getLeaveBalance(dicFilters: Record<string, string | number | undefined>): Promise<ReportEnvelope<LeaveBalanceRow>> {
    return getAllPages<LeaveBalanceRow>("/reports/leave/balance", dicFilters, "REPORTS_LEAVE_BALANCE");
  },
  async getLeaveRegister(dicFilters: Record<string, string | number | undefined>): Promise<ReportEnvelope<LeaveRegisterRow>> {
    return getAllPages<LeaveRegisterRow>("/reports/leave/applications", dicFilters, "REPORTS_LEAVE_REGISTER");
  },
  async getMonthlyAttendance(dicFilters: Record<string, string | number | undefined>): Promise<ReportEnvelope<MonthlyAttendanceRow>> {
    return getAllPages<MonthlyAttendanceRow>("/reports/attendance/monthly-summary", dicFilters, "REPORTS_ATTENDANCE_SUMMARY");
  },
  async getAttendanceExceptions(dicFilters: Record<string, string | number | undefined>): Promise<ReportEnvelope<AttendanceExceptionRow>> {
    return getAllPages<AttendanceExceptionRow>("/reports/attendance/exceptions", dicFilters, "REPORTS_ATTENDANCE_EXCEPTION");
  },
};
