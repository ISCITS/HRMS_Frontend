import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi, type ApiEnvelope } from "@/Common/utils/apiErrorHandler";
import type {
  ArrearAdjustmentLine,
  AttendanceIntegrationStatusRecord,
  AttendanceTraceRecord,
  AttendanceValidateRunResult,
  EmployeeAttendancePreview,
} from "@/features/payroll/types";

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: ApiRequestMethod | "GET" | "POST" | "PUT";
  objBody?: unknown;
  strMenuAction: string;
}): Promise<ApiEnvelope<TData>> {
  return requestEncryptedApi<TData>({
    strPath: `${ApiRoutePrefix.ApiV1}${objOptions.strPath}`,
    strMethod: objOptions.strMethod as ApiRequestMethod,
    objBody: objOptions.objBody,
    strMenuAction: objOptions.strMenuAction,
    blnUseAuthHeader: true,
  });
}

export const attendancePayrollService = {
  async validateRunAttendance(
    strRunID: string,
    lstEmployeeIDs?: number[],
    blnAllowFinalizedOverride?: boolean,
    strOverrideReason?: string
  ): Promise<AttendanceValidateRunResult> {
    const objBody: Record<string, unknown> = {};
    if (lstEmployeeIDs?.length) {
      objBody.lstEmployeeIDs = lstEmployeeIDs;
    }
    if (blnAllowFinalizedOverride) {
      objBody.blnAllowFinalizedOverride = true;
      objBody.strOverrideReason = strOverrideReason;
    }
    const objResult = await requestApi<AttendanceValidateRunResult>({
      strPath: `/payroll/runs/${strRunID}/attendance/validate`,
      strMethod: "POST",
      objBody: Object.keys(objBody).length ? objBody : undefined,
      strMenuAction: "PAYROLL_ATTENDANCE_VALIDATE",
    });
    return objResult.Data;
  },

  async finalizeAttendanceIntegration(
    strRunID: string
  ): Promise<{ intPayrollRunID: number; blnFinalized: boolean; intVersionNumber?: number; dicIntegrationStatus?: AttendanceIntegrationStatusRecord }> {
    const objResult = await requestApi<{ intPayrollRunID: number; blnFinalized: boolean; intVersionNumber?: number; dicIntegrationStatus?: AttendanceIntegrationStatusRecord }>({
      strPath: `/payroll/runs/${strRunID}/attendance/finalize`,
      strMethod: "POST",
      strMenuAction: "PAYROLL_ATTENDANCE_FINALIZE",
    });
    return objResult.Data;
  },

  async getIntegrationStatus(strRunID: string): Promise<AttendanceIntegrationStatusRecord> {
    const objResult = await requestApi<AttendanceIntegrationStatusRecord>({
      strPath: `/payroll/runs/${strRunID}/attendance/status`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_ATTENDANCE_VALIDATE",
    });
    return objResult.Data;
  },

  async previewEmployeeAttendance(
    strRunID: string,
    intEmployeeID: number
  ): Promise<EmployeeAttendancePreview> {
    const objResult = await requestApi<EmployeeAttendancePreview>({
      strPath: `/payroll/runs/${strRunID}/employees/${intEmployeeID}/attendance/preview`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_ATTENDANCE_PREVIEW",
    });
    return objResult.Data;
  },

  async getPayrollInputAttendanceTrace(
    intInputID: number
  ): Promise<AttendanceTraceRecord> {
    const objResult = await requestApi<AttendanceTraceRecord>({
      strPath: `/payroll/employee-payroll-inputs/${intInputID}/attendance/trace`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_ATTENDANCE_TRACE",
    });
    return objResult.Data;
  },

  async recomputeHistoricalAdjustment(
    strResultID: string,
    strSourceRecordType: string,
    intSourceRecordID: number
  ): Promise<unknown> {
    const objResult = await requestApi<unknown>({
      strPath: `/payroll/results/${strResultID}/attendance/recompute-adjustment`,
      strMethod: "POST",
      objBody: { strSourceRecordType, intSourceRecordID },
      strMenuAction: "PAYROLL_ARREAR_RECOMPUTE",
    });
    return objResult.Data;
  },

  async getEmployeeArrears(
    strRunID: string,
    intEmployeeID: number
  ): Promise<ArrearAdjustmentLine[]> {
    const objResult = await requestApi<ArrearAdjustmentLine[]>({
      strPath: `/payroll/runs/${strRunID}/employees/${intEmployeeID}/arrears`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_ARREARS_LIST",
    });
    return objResult.Data;
  },
};
