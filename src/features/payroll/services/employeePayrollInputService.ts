import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi, type ApiEnvelope } from "@/Common/utils/apiErrorHandler";
import type {
  EmployeePayrollInputDetailRecord,
  EmployeePayrollInputFormLine,
  EmployeePayrollInputFormOptions,
  EmployeePayrollInputFormValues,
  EmployeePayrollInputListRecord,
} from "@/features/payroll/types";

type EmployeePayrollInputApiRecord = EmployeePayrollInputDetailRecord;
const strEmployeePayrollInputApiPath = "/payroll/employee-payroll-inputs";

function isObjectRecord(objValue: unknown): objValue is Record<string, unknown> {
  return Boolean(objValue && typeof objValue === "object" && !Array.isArray(objValue));
}

function ensureEmployeePayrollInputDetail(
  objValue: unknown
): EmployeePayrollInputDetailRecord {
  if (
    !isObjectRecord(objValue) ||
    typeof objValue.intID !== "number" ||
    !Array.isArray(objValue.lstLines)
  ) {
    throw new Error("Payroll input detail was not returned by the API.");
  }

  return objValue as EmployeePayrollInputDetailRecord;
}

function normalizeLineType(
  strValue: string | null | undefined
): EmployeePayrollInputFormLine["strLineType"] {
  const strNormalizedValue = (strValue ?? "").trim().toLowerCase();
  if (strNormalizedValue === "earning") {
    return "addition";
  }
  if (
    strNormalizedValue === "addition" ||
    strNormalizedValue === "deduction" ||
    strNormalizedValue === "recovery" ||
    strNormalizedValue === "arrear" ||
    strNormalizedValue === "reimbursement"
  ) {
    return strNormalizedValue;
  }
  return "addition";
}

function getTodayDateSeed() {
  return Date.now();
}

function parseOptionalNumber(strValue: string): number | null {
  const strTrimmedValue = strValue.trim();
  if (!strTrimmedValue) {
    return null;
  }
  const decValue = Number(strTrimmedValue);
  return Number.isFinite(decValue) ? decValue : null;
}

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

function mapLineForForm(dicLine: EmployeePayrollInputDetailRecord["lstLines"][number], intIndex: number): EmployeePayrollInputFormLine {
  return {
    intTempID: dicLine.intID || getTodayDateSeed() + intIndex,
    intSalaryComponentID: dicLine.intSalaryComponentID,
    strLineType: normalizeLineType(dicLine.strLineType),
    strAmount: String(dicLine.decAmount ?? ""),
    strRemarks: dicLine.strRemarks ?? "",
  };
}

function toPayload(dicValues: EmployeePayrollInputFormValues) {
  return {
    intPayrollRunID: Number(dicValues.intPayrollRunID),
    intEmployeeID: Number(dicValues.intEmployeeID),
    decCalendarDays: parseOptionalNumber(dicValues.strCalendarDays),
    decWorkingDays: parseOptionalNumber(dicValues.strWorkingDays),
    decPaidDays: parseOptionalNumber(dicValues.strPaidDays),
    decPayableDays: parseOptionalNumber(dicValues.strPayableDays),
    decLwpDays: parseOptionalNumber(dicValues.strLwpDays),
    decLopDays: parseOptionalNumber(dicValues.strLopDays),
    // Always stamp MANUAL_HR on save from this screen, rather than echoing back whatever
    // strManualLwpSource was loaded with (e.g. "SYSTEM_ATTENDANCE" on a row previously
    // auto-synced from attendance). This is the manual payroll-input editor - saving here
    // is the human taking explicit ownership of this record, and it must be recognized as
    // such so the next automatic "Check Leave & Attendance" sync preserves it instead of
    // silently overwriting it (AttendancePayrollIntegrationService.upsertPayrollInputForEmployee
    // only preserves a manual value when strManualLwpSource != "SYSTEM_ATTENDANCE").
    strManualLwpSource: "MANUAL_HR",
    strManualLwpReason: dicValues.strManualLwpReason.trim() || null,
    strRemarks: dicValues.strRemarks.trim() || null,
    strStatus: dicValues.strStatus,
    blnIsLocked: dicValues.blnIsLocked,
    lstLines: dicValues.lstLines.map((dicLine) => ({
      intSalaryComponentID: Number(dicLine.intSalaryComponentID),
      strLineType: normalizeLineType(dicLine.strLineType),
      decAmount: Number(dicLine.strAmount),
      strRemarks: dicLine.strRemarks.trim() || null,
    })),
  };
}

export function createEmptyEmployeePayrollInputLine(): EmployeePayrollInputFormLine {
  return {
    intTempID: getTodayDateSeed(),
    intSalaryComponentID: "",
    strLineType: "addition",
    strAmount: "",
    strRemarks: "",
  };
}

export function createInitialEmployeePayrollInputForm(): EmployeePayrollInputFormValues {
  return {
    intPayrollRunID: "",
    intEmployeeID: "",
    strCalendarDays: "",
    strWorkingDays: "",
    strPaidDays: "",
    strPayableDays: "",
    strLwpDays: "",
    strLopDays: "",
    strManualLwpReason: "",
    strManualLwpSource: "",
    dtManualLwpCapturedOn: null,
    intManualLwpCapturedBy: null,
    strRemarks: "",
    strStatus: "Draft",
    blnIsLocked: false,
    lstLines: [createEmptyEmployeePayrollInputLine()],
  };
}

export function toEmployeePayrollInputFormValues(
  dicRecord: EmployeePayrollInputDetailRecord
): EmployeePayrollInputFormValues {
  return {
    intPayrollRunID: dicRecord.intPayrollRunID,
    intEmployeeID: dicRecord.intEmployeeID,
    strCalendarDays: dicRecord.decCalendarDays?.toString() ?? "",
    strWorkingDays: dicRecord.decWorkingDays?.toString() ?? "",
    strPaidDays: dicRecord.decPaidDays?.toString() ?? "",
    strPayableDays: dicRecord.decPayableDays?.toString() ?? "",
    strLwpDays: dicRecord.decLwpDays?.toString() ?? "",
    strLopDays: dicRecord.decLopDays?.toString() ?? "",
    strManualLwpReason: dicRecord.strManualLwpReason ?? "",
    strManualLwpSource: dicRecord.strManualLwpSource ?? "",
    dtManualLwpCapturedOn: dicRecord.dtManualLwpCapturedOn ?? null,
    intManualLwpCapturedBy: dicRecord.intManualLwpCapturedBy ?? null,
    strRemarks: dicRecord.strRemarks ?? "",
    strStatus: dicRecord.strStatus,
    blnIsLocked: dicRecord.blnIsLocked,
    lstLines: dicRecord.lstLines.length
      ? dicRecord.lstLines.map(mapLineForForm)
      : [createEmptyEmployeePayrollInputLine()],
  };
}

export const employeePayrollInputService = {
  async getEmployeePayrollInputs(objFilters?: {
    strSearchEmployee?: string;
    strSearchRun?: string;
    strStatus?: string;
  }): Promise<EmployeePayrollInputListRecord[]> {
    const objParams = new URLSearchParams();
    if (objFilters?.strSearchEmployee?.trim()) {
      objParams.set("strSearchEmployee", objFilters.strSearchEmployee.trim());
    }
    if (objFilters?.strSearchRun?.trim()) {
      objParams.set("strSearchRun", objFilters.strSearchRun.trim());
    }
    if (objFilters?.strStatus?.trim() && objFilters.strStatus !== "All") {
      objParams.set("strStatus", objFilters.strStatus.trim());
    }
    const strQuery = objParams.toString();
    const objResult = await requestApi<EmployeePayrollInputListRecord[]>({
      strPath: `${strEmployeePayrollInputApiPath}${strQuery ? `?${strQuery}` : ""}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_EMPLOYEE_PAYROLL_INPUT_LIST",
    });
    return objResult.Data;
  },

  async getFormOptions(objFilters?: { intEmployeeID?: number | null }): Promise<EmployeePayrollInputFormOptions> {
    const objParams = new URLSearchParams();
    if (objFilters?.intEmployeeID) {
      objParams.set("intEmployeeID", String(objFilters.intEmployeeID));
    }
    const strQuery = objParams.toString();
    const objResult = await requestApi<EmployeePayrollInputFormOptions>({
      strPath: `${strEmployeePayrollInputApiPath}/form-options${strQuery ? `?${strQuery}` : ""}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_EMPLOYEE_PAYROLL_INPUT_FORM_OPTIONS",
    });
    return objResult.Data;
  },

  async getEmployeePayrollInputById(
    intInputID: number
  ): Promise<EmployeePayrollInputDetailRecord> {
    const objResult = await requestApi<EmployeePayrollInputApiRecord>({
      strPath: `${strEmployeePayrollInputApiPath}/${intInputID}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_EMPLOYEE_PAYROLL_INPUT_VIEW",
    });
    return ensureEmployeePayrollInputDetail(objResult.Data);
  },

  async createEmployeePayrollInput(
    dicValues: EmployeePayrollInputFormValues
  ): Promise<EmployeePayrollInputDetailRecord> {
    const objResult = await requestApi<EmployeePayrollInputApiRecord>({
      strPath: strEmployeePayrollInputApiPath,
      strMethod: "POST",
      objBody: toPayload(dicValues),
      strMenuAction: "PAYROLL_EMPLOYEE_PAYROLL_INPUT_CREATE",
    });
    return objResult.Data;
  },

  async updateEmployeePayrollInput(
    intInputID: number,
    dicValues: EmployeePayrollInputFormValues
  ): Promise<EmployeePayrollInputDetailRecord> {
    const objResult = await requestApi<EmployeePayrollInputApiRecord>({
      strPath: `${strEmployeePayrollInputApiPath}/${intInputID}`,
      strMethod: "PUT",
      objBody: toPayload(dicValues),
      strMenuAction: "PAYROLL_EMPLOYEE_PAYROLL_INPUT_UPDATE",
    });
    return objResult.Data;
  },

  async unlockEmployeePayrollInput(
    intInputID: number
  ): Promise<EmployeePayrollInputDetailRecord> {
    const objResult = await requestApi<EmployeePayrollInputApiRecord>({
      strPath: `${strEmployeePayrollInputApiPath}/${intInputID}/unlock`,
      strMethod: "POST",
      strMenuAction: "PAYROLL_EMPLOYEE_PAYROLL_INPUT_UPDATE",
    });
    return ensureEmployeePayrollInputDetail(objResult.Data);
  },
};
