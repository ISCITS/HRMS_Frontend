"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import type {
  AttendanceDayDto,
  MyShiftDto,
  PunchRequest,
  RosterRequest,
  ShiftDto,
  ShiftRequest,
} from "@/features/attendance/dto";
import type {
  AttendancePolicy,
  AttendancePolicyAssignmentEmployee,
  AttendancePolicyAssignmentHistory,
  AttendancePolicyAssignmentRequest,
  AttendancePolicyAssignmentResult,
  AttendancePolicyFormValues,
  AttendancePolicyList,
  DailyAttendanceBulkFillRangeRequest,
  DailyAttendanceBulkFillRangeResult,
  DailyAttendanceBulkResult,
  DailyAttendanceFinalizeRequest,
  DailyAttendanceFinalizeResult,
  DailyAttendanceOverrideRequest,
  DailyAttendanceRow,
  DailyAttendanceSaveRow,
} from "@/features/attendance/types";
import type {
  MyAttendanceHistory,
  MyAttendanceOverview,
} from "@/features/attendance/types/MyAttendanceTypes";

const ATTENDANCE_VIEW = "ATTENDANCE_VIEW";
const ATTENDANCE_MANAGE = "ATTENDANCE_MANAGE";
const ATTENDANCE_CORRECTION = "ATTENDANCE_CORRECTION";

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: ApiRequestMethod;
  objBody?: unknown;
  strMenuAction: string;
}) {
  return requestEncryptedApi<TData>({
    strPath: `${ApiRoutePrefix.ApiV1}${objOptions.strPath}`,
    strMethod: objOptions.strMethod,
    objBody: objOptions.objBody,
    strMenuAction: objOptions.strMenuAction,
    blnUseAuthHeader: true,
  });
}

function toAttendancePolicyFormValues(objPolicy: AttendancePolicyFormValues): AttendancePolicyFormValues {
  // The read API also returns audit metadata (added/modified fields). Keep the
  // frontend model restricted to fields accepted by the create/update schema,
  // otherwise React Hook Form retains those unregistered keys and sends them
  // back during Edit.
  return {
    intCompanyID: objPolicy.intCompanyID,
    strPolicyCode: objPolicy.strPolicyCode,
    strPolicyName: objPolicy.strPolicyName,
    strDescription: objPolicy.strDescription,
    intLocationID: objPolicy.intLocationID,
    intGradeID: objPolicy.intGradeID,
    intEmploymentTypeID: objPolicy.intEmploymentTypeID,
    intLateGraceMinutes: objPolicy.intLateGraceMinutes,
    intEarlyDepartureGraceMinutes: objPolicy.intEarlyDepartureGraceMinutes,
    strInTime: objPolicy.strInTime,
    strOutTime: objPolicy.strOutTime,
    decFullDayThresholdHours: objPolicy.decFullDayThresholdHours,
    decHalfDayThresholdHours: objPolicy.decHalfDayThresholdHours,
    decAbsentThresholdHours: objPolicy.decAbsentThresholdHours,
    blnInPunchRequired: objPolicy.blnInPunchRequired,
    blnOutPunchRequired: objPolicy.blnOutPunchRequired,
    strMissingPunchTreatmentCode: objPolicy.strMissingPunchTreatmentCode,
    intWorkHoursRoundingMinutes: objPolicy.intWorkHoursRoundingMinutes,
    blnOtEnabled: objPolicy.blnOtEnabled,
    decOtMinHours: objPolicy.decOtMinHours,
    strLateDeductionRule: objPolicy.strLateDeductionRule,
    strWeeklyOffPattern: objPolicy.strWeeklyOffPattern,
    blnIsDefault: objPolicy.blnIsDefault,
    dtEffectiveFrom: objPolicy.dtEffectiveFrom,
    dtEffectiveTo: objPolicy.dtEffectiveTo,
    blnIsActive: objPolicy.blnIsActive,
    strRemarks: objPolicy.strRemarks,
    lstTexts: objPolicy.lstTexts ?? [],
  };
}

function toAttendancePolicy(objPolicy: AttendancePolicy): AttendancePolicy {
  return {
    intID: objPolicy.intID,
    ...toAttendancePolicyFormValues(objPolicy),
    blnHasAssignmentsOrUsage: objPolicy.blnHasAssignmentsOrUsage,
  };
}

export const attendanceService = {
  async listPolicies(objFilters: { strSearch?: string; blnIsActive?: boolean; intPage: number; intPageSize: number }): Promise<AttendancePolicyList> {
    const objQuery = new URLSearchParams({ page: String(objFilters.intPage), page_size: String(objFilters.intPageSize) });
    if (objFilters.strSearch) objQuery.set("search", objFilters.strSearch);
    if (objFilters.blnIsActive !== undefined) objQuery.set("is_active", String(objFilters.blnIsActive));
    const objResult = await requestApi<AttendancePolicyList>({ strPath: `/attendance/policies?${objQuery}`, strMethod: ApiRequestMethod.Get, strMenuAction: ATTENDANCE_VIEW });
    return {
      ...objResult.Data,
      lstItems: objResult.Data.lstItems.map(toAttendancePolicy),
    };
  },

  async getPolicy(intPolicyID: number): Promise<AttendancePolicy> {
    const objResult = await requestApi<AttendancePolicy>({ strPath: `/attendance/policies/${intPolicyID}`, strMethod: ApiRequestMethod.Get, strMenuAction: ATTENDANCE_VIEW });
    return toAttendancePolicy(objResult.Data);
  },

  async savePolicy(intPolicyID: number | null, objPayload: AttendancePolicyFormValues): Promise<AttendancePolicy> {
    const objResult = await requestApi<AttendancePolicy>({
      strPath: intPolicyID ? `/attendance/policies/${intPolicyID}` : "/attendance/policies",
      strMethod: intPolicyID ? ApiRequestMethod.Put : ApiRequestMethod.Post,
      objBody: toAttendancePolicyFormValues(objPayload),
      strMenuAction: ATTENDANCE_MANAGE,
    });
    return toAttendancePolicy(objResult.Data);
  },

  async setPolicyStatus(intPolicyID: number, blnIsActive: boolean): Promise<AttendancePolicy> {
    const objResult = await requestApi<AttendancePolicy>({ strPath: `/attendance/policies/${intPolicyID}/status`, strMethod: ApiRequestMethod.Patch, objBody: { blnIsActive }, strMenuAction: ATTENDANCE_MANAGE });
    return toAttendancePolicy(objResult.Data);
  },

  async deletePolicy(intPolicyID: number): Promise<AttendancePolicy> {
    const objResult = await requestApi<AttendancePolicy>({
      strPath: `/attendance/policies/${intPolicyID}`,
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: ATTENDANCE_MANAGE,
    });
    return toAttendancePolicy(objResult.Data);
  },

  async listPolicyAssignmentEmployees(objFilters: {
    strSearch?: string;
    intDepartmentID?: number;
    intCurrentPolicyID?: number;
    strEmployeeStatus?: string;
    strEffectiveOn?: string;
  }): Promise<AttendancePolicyAssignmentEmployee[]> {
    const objQuery = new URLSearchParams();
    if (objFilters.strSearch) objQuery.set("search", objFilters.strSearch);
    if (objFilters.intDepartmentID) objQuery.set("department_id", String(objFilters.intDepartmentID));
    if (objFilters.intCurrentPolicyID) objQuery.set("current_policy_id", String(objFilters.intCurrentPolicyID));
    if (objFilters.strEmployeeStatus) objQuery.set("employee_status", objFilters.strEmployeeStatus);
    if (objFilters.strEffectiveOn) objQuery.set("effective_on", objFilters.strEffectiveOn);
    const objResult = await requestApi<AttendancePolicyAssignmentEmployee[]>({
      strPath: `/attendance/policies/assignments/employees?${objQuery.toString()}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: ATTENDANCE_VIEW,
    });
    return objResult.Data ?? [];
  },

  async listPolicyAssignmentHistory(objFilters: { intEmployeeID?: number; intPolicyID?: number }): Promise<AttendancePolicyAssignmentHistory[]> {
    const objQuery = new URLSearchParams();
    if (objFilters.intEmployeeID) objQuery.set("employee_id", String(objFilters.intEmployeeID));
    if (objFilters.intPolicyID) objQuery.set("policy_id", String(objFilters.intPolicyID));
    const objResult = await requestApi<AttendancePolicyAssignmentHistory[]>({
      strPath: `/attendance/policies/assignments/history?${objQuery.toString()}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: ATTENDANCE_VIEW,
    });
    return objResult.Data ?? [];
  },

  async assignAttendancePolicy(objPayload: AttendancePolicyAssignmentRequest): Promise<AttendancePolicyAssignmentResult> {
    const objResult = await requestApi<AttendancePolicyAssignmentResult>({
      strPath: "/attendance/policies/assignments",
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: ATTENDANCE_MANAGE,
    });
    return objResult.Data;
  },

  async loadDaily(objFilters: { strDate: string; intDepartmentID?: number; intLocationID?: number; strSearch?: string }): Promise<DailyAttendanceRow[]> {
    const objQuery = new URLSearchParams({ date: objFilters.strDate });
    if (objFilters.intDepartmentID) objQuery.set("department_id", String(objFilters.intDepartmentID));
    if (objFilters.intLocationID) objQuery.set("location_id", String(objFilters.intLocationID));
    if (objFilters.strSearch) objQuery.set("search", objFilters.strSearch);
    const objResult = await requestApi<{ dtWorkDate: string; lstRows: DailyAttendanceRow[] }>({ strPath: `/attendance/daily?${objQuery}`, strMethod: ApiRequestMethod.Get, strMenuAction: ATTENDANCE_VIEW });
    return objResult.Data.lstRows ?? [];
  },

  async bulkSaveDaily(strDate: string, lstRows: DailyAttendanceSaveRow[]): Promise<DailyAttendanceBulkResult> {
    const objResult = await requestApi<DailyAttendanceBulkResult>({ strPath: "/attendance/daily/bulk", strMethod: ApiRequestMethod.Put, objBody: { dtWorkDate: strDate, lstRows }, strMenuAction: ATTENDANCE_MANAGE });
    return objResult.Data;
  },

  async bulkFillRange(objPayload: DailyAttendanceBulkFillRangeRequest): Promise<DailyAttendanceBulkFillRangeResult> {
    const objResult = await requestApi<DailyAttendanceBulkFillRangeResult>({
      strPath: "/attendance/daily/bulk-fill-range",
      strMethod: ApiRequestMethod.Put,
      objBody: objPayload,
      strMenuAction: ATTENDANCE_MANAGE,
    });
    return objResult.Data;
  },

  // Row-level HR Edit/Override (Developer Guide Section E) - gated by the dedicated
  // ATTENDANCE_CORRECTION permission, distinct from general ATTENDANCE_MANAGE.
  async saveDailyOverride(objPayload: DailyAttendanceOverrideRequest): Promise<DailyAttendanceRow> {
    const objResult = await requestApi<DailyAttendanceRow>({
      strPath: "/attendance/daily",
      strMethod: ApiRequestMethod.Put,
      objBody: objPayload,
      strMenuAction: ATTENDANCE_CORRECTION,
    });
    return objResult.Data;
  },

  async finalizeAttendance(objPayload: DailyAttendanceFinalizeRequest): Promise<DailyAttendanceFinalizeResult> {
    const objResult = await requestApi<DailyAttendanceFinalizeResult>({
      strPath: "/attendance/daily/finalize",
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: ATTENDANCE_MANAGE,
    });
    return objResult.Data;
  },

  // ---- ESS ----
  async punch(objPayload: PunchRequest): Promise<MyAttendanceOverview> {
    const objResult = await requestApi<MyAttendanceOverview>({
      strPath: "/ess/attendance/punch",
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: ATTENDANCE_VIEW,
    });
    return objResult.Data;
  },

  // employee_id is optional and defaults server-side to the caller; when supplied it must be
  // the caller themselves or one of their direct reports (line/reporting manager), enforced by
  // GET /ess/attendance/employees below - lets a manager view a report's attendance without HR
  // access, distinct from the HR "Employee Attendance" review endpoints further down.
  async getMyAttendanceOverview(strDate: string, intEmployeeID?: number): Promise<MyAttendanceOverview> {
    const objQuery = new URLSearchParams({ date: strDate });
    if (intEmployeeID) objQuery.set("employee_id", String(intEmployeeID));
    const objResult = await requestApi<MyAttendanceOverview>({
      strPath: `/ess/attendance/overview?${objQuery}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: ATTENDANCE_VIEW,
    });
    return objResult.Data;
  },

  async getMyAttendanceHistory(
    strFromDate: string,
    strToDate: string,
    intEmployeeID?: number,
  ): Promise<MyAttendanceHistory> {
    const objQuery = new URLSearchParams({ fromDate: strFromDate, toDate: strToDate });
    if (intEmployeeID) objQuery.set("employee_id", String(intEmployeeID));
    const objResult = await requestApi<MyAttendanceHistory>({
      strPath: `/ess/attendance/history?${objQuery}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: ATTENDANCE_VIEW,
    });
    return objResult.Data;
  },

  async getMyCalendar(strPeriod: string): Promise<AttendanceDayDto[]> {
    const objResult = await requestApi<AttendanceDayDto[]>({
      strPath: `/ess/attendance/calendar?period=${encodeURIComponent(strPeriod)}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: ATTENDANCE_VIEW,
    });
    return objResult.Data ?? [];
  },

  async getMyShift(intEmployeeID?: number): Promise<MyShiftDto | null> {
    const strPath = intEmployeeID ? `/ess/attendance/shift?employee_id=${intEmployeeID}` : "/ess/attendance/shift";
    const objResult = await requestApi<MyShiftDto | null>({
      strPath,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: ATTENDANCE_VIEW,
    });
    return objResult.Data ?? null;
  },

  // Employees selectable in the "My Attendance" Employee dropdown: the caller, plus anyone who
  // reports to them as line/reporting manager. Empty-list-of-one (self only) means the caller
  // manages nobody, so the panel hides the dropdown entirely.
  async getMyAttendanceEmployees(): Promise<{ intEmployeeID: number; strFullName: string; strEmployeeCode: string | null; blnIsSelf: boolean }[]> {
    const objResult = await requestApi<{ intEmployeeID: number; strFullName: string; strEmployeeCode: string | null; blnIsSelf: boolean }[]>({
      strPath: "/ess/attendance/employees",
      strMethod: ApiRequestMethod.Get,
      strMenuAction: ATTENDANCE_VIEW,
    });
    return objResult.Data ?? [];
  },

  // ---- HR: Employee Attendance review (any employee in the tenant/company) ----
  async getAttendanceReviewOverview(strDate: string, intEmployeeID: number): Promise<MyAttendanceOverview> {
    const objResult = await requestApi<MyAttendanceOverview>({
      strPath: `/attendance/review/overview?date=${encodeURIComponent(strDate)}&employee_id=${intEmployeeID}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: ATTENDANCE_VIEW,
    });
    return objResult.Data;
  },

  async getAttendanceReviewHistory(strFromDate: string, strToDate: string, intEmployeeID: number): Promise<MyAttendanceHistory> {
    const objResult = await requestApi<MyAttendanceHistory>({
      strPath: `/attendance/review/history?fromDate=${encodeURIComponent(strFromDate)}&toDate=${encodeURIComponent(strToDate)}&employee_id=${intEmployeeID}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: ATTENDANCE_VIEW,
    });
    return objResult.Data;
  },

  async getAttendanceReviewShift(intEmployeeID: number): Promise<MyShiftDto | null> {
    const objResult = await requestApi<MyShiftDto | null>({
      strPath: `/attendance/review/shift?employee_id=${intEmployeeID}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: ATTENDANCE_VIEW,
    });
    return objResult.Data ?? null;
  },

  // ---- HR / Admin ----
  async listShifts(): Promise<ShiftDto[]> {
    const objResult = await requestApi<ShiftDto[]>({
      strPath: "/attendance/shifts",
      strMethod: ApiRequestMethod.Get,
      strMenuAction: ATTENDANCE_VIEW,
    });
    return objResult.Data ?? [];
  },

  async createShift(objPayload: ShiftRequest): Promise<ShiftDto> {
    const objResult = await requestApi<ShiftDto>({
      strPath: "/attendance/shifts",
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: ATTENDANCE_MANAGE,
    });
    return objResult.Data;
  },

  async assignRoster(objPayload: RosterRequest): Promise<unknown> {
    const objResult = await requestApi<unknown>({
      strPath: "/attendance/roster/assign",
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: ATTENDANCE_MANAGE,
    });
    return objResult.Data;
  },

  async getMuster(strDate: string): Promise<AttendanceDayDto[]> {
    const objResult = await requestApi<AttendanceDayDto[]>({
      strPath: `/attendance/muster?date=${encodeURIComponent(strDate)}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: ATTENDANCE_VIEW,
    });
    return objResult.Data ?? [];
  },

  async reconcile(intEmployeeID: number, strPeriod: string): Promise<{ intDaysReconciled: number; strPeriod: string }> {
    const objResult = await requestApi<{ intDaysReconciled: number; strPeriod: string }>({
      strPath: `/attendance/reconcile?employee_id=${intEmployeeID}&period=${encodeURIComponent(strPeriod)}`,
      strMethod: ApiRequestMethod.Post,
      objBody: {},
      strMenuAction: ATTENDANCE_MANAGE,
    });
    return objResult.Data;
  },
};
