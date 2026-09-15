import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi, type ApiEnvelope } from "@/Common/utils/apiErrorHandler";
import type {
  FNFAuditRecord,
  FNFDefaultPayrollRunOption,
  FNFEmployeeOption,
  FNFLineFormValues,
  FNFSettlementFormValues,
  FNFSettlementLineRecord,
  FNFSettlementRecord,
  FNFStatementRecord,
} from "@/features/payroll/types";

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: ApiRequestMethod | "GET" | "POST" | "PUT" | "DELETE";
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

export function createInitialFNFSettlementForm(): FNFSettlementFormValues {
  const strToday = new Date().toISOString().slice(0, 10);
  return {
    strEmployeeCode: "",
    strSettlementNumber: "",
    intPayrollRunID: "",
    strExitType: "resignation",
    strExitReason: "",
    dtResignationDate: "",
    dtLastWorkingDate: strToday,
    dtSettlementDate: strToday,
    dtSettlementMonth: strToday.slice(0, 8) + "01",
    decNoticePeriodDays: "0",
    decNoticeServedDays: "0",
    decNoticeShortfallDays: "0",
    strCurrencyCode: "INR",
    strRemarks: "",
  };
}

function toSettlementPayload(dicValues: FNFSettlementFormValues) {
  const lstLeaveEncashments = (dicValues.lstLeaveEncashments || [])
    .filter((dicLeave) => Number(dicLeave.decEncashableDays || dicLeave.decBalanceDays || 0) > 0)
    .map((dicLeave) => ({
      strLeaveTypeCode: dicLeave.strLeaveTypeCode,
      strLeaveTypeName: dicLeave.strLeaveTypeName,
      decBalanceDays: Number(dicLeave.decBalanceDays || 0),
      decEncashableDays: Number(dicLeave.decEncashableDays || dicLeave.decBalanceDays || 0),
    }));
  return {
    intEmployeeID: dicValues.intEmployeeID ? Number(dicValues.intEmployeeID) : undefined,
    strEmployeeCode: dicValues.strEmployeeCode.trim(),
    strSettlementNumber: dicValues.strSettlementNumber.trim() || undefined,
    intPayrollRunID: dicValues.intPayrollRunID ? Number(dicValues.intPayrollRunID) : undefined,
    strExitType: dicValues.strExitType.trim(),
    strExitReason: dicValues.strExitReason.trim() || undefined,
    dtResignationDate: dicValues.dtResignationDate || undefined,
    dtLastWorkingDate: dicValues.dtLastWorkingDate,
    dtSettlementDate: dicValues.dtSettlementDate || undefined,
    dtSettlementMonth: dicValues.dtSettlementMonth || undefined,
    decNoticePeriodDays: Number(dicValues.decNoticePeriodDays || 0),
    decNoticeServedDays: Number(dicValues.decNoticeServedDays || 0),
    decNoticeShortfallDays: Number(dicValues.decNoticeShortfallDays || 0),
    strCurrencyCode: dicValues.strCurrencyCode.trim() || "INR",
    strRemarks: dicValues.strRemarks.trim() || undefined,
    lstLeaveEncashments,
  };
}

function toLinePayload(dicValues: FNFLineFormValues) {
  return {
    strLineType: dicValues.strLineType,
    strRecoveryType: dicValues.strLineType === "RECOVERY" ? dicValues.strRecoveryType : undefined,
    strLineCode: dicValues.strLineCode.trim(),
    strLineName: dicValues.strLineName.trim(),
    decActualAmount: Number(dicValues.decActualAmount || dicValues.decAmount || 0),
    decAmount: Number(dicValues.decAmount || 0),
    blnIsManualOverride: dicValues.blnIsManualOverride,
    strOverrideReason: dicValues.strOverrideReason.trim() || undefined,
    strRemarks: dicValues.strRemarks.trim() || undefined,
  };
}

export const fnfSettlementService = {
  async listEmployeeOptions(): Promise<FNFEmployeeOption[]> {
    const objResult = await requestApi<FNFEmployeeOption[]>({
      strPath: "/payroll/fnf-settlements/employee-options",
      strMethod: "GET",
      strMenuAction: "PAYROLL_FNF_VIEW",
    });
    return objResult.Data;
  },
  async getDefaultPayrollRunForEmployee(intEmployeeID: number): Promise<FNFDefaultPayrollRunOption | null> {
    const objResult = await requestApi<FNFDefaultPayrollRunOption | null>({
      strPath: `/payroll/fnf-settlements/employee-options/${intEmployeeID}/default-payroll-run`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_FNF_VIEW",
    });
    return objResult.Data;
  },
  async listSettlements(objFilters?: Record<string, string>): Promise<FNFSettlementRecord[]> {
    const objParams = new URLSearchParams();
    Object.entries(objFilters || {}).forEach(([strKey, strValue]) => {
      if (strValue && strValue !== "All") objParams.set(strKey, strValue);
    });
    const strQuery = objParams.toString();
    const objResult = await requestApi<FNFSettlementRecord[]>({
      strPath: `/payroll/fnf-settlements${strQuery ? `?${strQuery}` : ""}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_FNF_VIEW",
    });
    return objResult.Data;
  },
  async createSettlement(dicValues: FNFSettlementFormValues): Promise<FNFSettlementRecord> {
    const objResult = await requestApi<FNFSettlementRecord>({
      strPath: "/payroll/fnf-settlements",
      strMethod: "POST",
      objBody: toSettlementPayload(dicValues),
      strMenuAction: "PAYROLL_FNF_CREATE",
    });
    return objResult.Data;
  },
  async getSettlement(strRecordUUID: string): Promise<FNFSettlementRecord> {
    const objResult = await requestApi<FNFSettlementRecord>({
      strPath: `/payroll/fnf-settlements/${strRecordUUID}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_FNF_VIEW",
    });
    return objResult.Data;
  },
  async updateSettlement(strRecordUUID: string, dicValues: FNFSettlementFormValues): Promise<FNFSettlementRecord> {
    const objResult = await requestApi<FNFSettlementRecord>({
      strPath: `/payroll/fnf-settlements/${strRecordUUID}`,
      strMethod: "PUT",
      objBody: toSettlementPayload(dicValues),
      strMenuAction: "PAYROLL_FNF_EDIT",
    });
    return objResult.Data;
  },
  async action(strRecordUUID: string, strAction: string, objBody?: unknown): Promise<FNFSettlementRecord> {
    const dicActionCodeByAction: Record<string, string> = {
      calculate: "PAYROLL_FNF_CALCULATE",
      "submit-review": "PAYROLL_FNF_EDIT",
      approve: "PAYROLL_FNF_APPROVE",
      release: "PAYROLL_FNF_RELEASE",
      lock: "PAYROLL_FNF_LOCK",
      "mark-paid": "PAYROLL_FNF_MARK_PAID",
      "mark-recovered": "PAYROLL_FNF_MARK_PAID",
      cancel: "PAYROLL_FNF_CANCEL",
    };
    const objResult = await requestApi<FNFSettlementRecord>({
      strPath: `/payroll/fnf-settlements/${strRecordUUID}/${strAction}`,
      strMethod: "POST",
      objBody,
      strMenuAction: dicActionCodeByAction[strAction] || "PAYROLL_FNF_VIEW",
    });
    return objResult.Data;
  },
  async getAudit(strRecordUUID: string): Promise<FNFAuditRecord[]> {
    const objResult = await requestApi<FNFAuditRecord[]>({
      strPath: `/payroll/fnf-settlements/${strRecordUUID}/audit`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_FNF_AUDIT_VIEW",
    });
    return objResult.Data;
  },
  async getStatement(strRecordUUID: string): Promise<FNFStatementRecord> {
    const objResult = await requestApi<FNFStatementRecord>({
      strPath: `/payroll/fnf-settlements/${strRecordUUID}/statement`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_FNF_VIEW",
    });
    return objResult.Data;
  },
  async addLine(strRecordUUID: string, dicValues: FNFLineFormValues): Promise<FNFSettlementLineRecord> {
    const objResult = await requestApi<FNFSettlementLineRecord>({
      strPath: `/payroll/fnf-settlements/${strRecordUUID}/lines`,
      strMethod: "POST",
      objBody: toLinePayload(dicValues),
      strMenuAction: "PAYROLL_FNF_EDIT",
    });
    return objResult.Data;
  },
  async updateLine(strRecordUUID: string, intLineID: number, dicValues: FNFLineFormValues): Promise<FNFSettlementLineRecord> {
    const objResult = await requestApi<FNFSettlementLineRecord>({
      strPath: `/payroll/fnf-settlements/${strRecordUUID}/lines/${intLineID}`,
      strMethod: "PUT",
      objBody: toLinePayload(dicValues),
      strMenuAction: "PAYROLL_FNF_EDIT",
    });
    return objResult.Data;
  },
  async deleteLine(strRecordUUID: string, intLineID: number): Promise<void> {
    await requestApi({
      strPath: `/payroll/fnf-settlements/${strRecordUUID}/lines/${intLineID}`,
      strMethod: "DELETE",
      strMenuAction: "PAYROLL_FNF_EDIT",
    });
  },
};
