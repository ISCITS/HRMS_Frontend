import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi, type ApiEnvelope } from "@/Common/utils/apiErrorHandler";
import type {
  FNFAuditRecord,
  FNFBulkCreateItem,
  FNFBulkCreateResponse,
  FNFEmployeeOption,
  FNFEmployeePrefill,
  FNFReportResponse,
  FNFLineFormValues,
  FNFPaymentAdviceResponse,
  FNFPayslipDocument,
  FNFPayslipEmployeeOption,
  FNFPayslipRecord,
  FNFRegularPayslipRecord,
  FNFPolicy,
  FNFPolicyResponse,
  FNFRegisterResponse,
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
  // Leave rows are sent only by forms that edit them (the create wizard); the Edit Details dialog
  // leaves them out so saving the header never replaces the settlement's leave rows.
  const lstLeaveEncashments = dicValues.lstLeaveEncashments
    ?.filter((dicLeave) => Number(dicLeave.decEncashableDays || dicLeave.decBalanceDays || 0) > 0)
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
    ...(lstLeaveEncashments ? { lstLeaveEncashments } : {}),
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
    decTaxableAmount: dicValues.strLineType === "EARNING" ? Number(dicValues.decTaxableAmount || 0) : 0,
    blnIsManualOverride: dicValues.blnIsManualOverride,
    strOverrideReason: dicValues.strOverrideReason.trim() || undefined,
    strRemarks: dicValues.strRemarks.trim() || undefined,
  };
}

export const fnfSettlementService = {
  /** blnEligibleForNew: only employees with a date of exit in the employee master and no settlement yet. */
  async listEmployeeOptions(blnEligibleForNew = false): Promise<FNFEmployeeOption[]> {
    const objResult = await requestApi<FNFEmployeeOption[]>({
      strPath: `/payroll/fnf-settlements/employee-options${blnEligibleForNew ? "?eligible_for_new=true" : ""}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_FNF_VIEW",
    });
    return objResult.Data;
  },
  async getEmployeePrefill(intEmployeeID: number, strLastWorkingDate?: string): Promise<FNFEmployeePrefill> {
    const objParams = new URLSearchParams({ employee_id: String(intEmployeeID) });
    if (strLastWorkingDate) objParams.set("last_working_date", strLastWorkingDate);
    const objResult = await requestApi<FNFEmployeePrefill>({
      strPath: `/payroll/fnf-settlements/employee-prefill?${objParams.toString()}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_FNF_CREATE",
    });
    return objResult.Data;
  },
  async bulkCreate(lstItems: FNFBulkCreateItem[], blnCalculate: boolean): Promise<FNFBulkCreateResponse> {
    const objResult = await requestApi<FNFBulkCreateResponse>({
      strPath: "/payroll/fnf-settlements/bulk",
      strMethod: "POST",
      objBody: { lstItems, blnCalculate },
      strMenuAction: "PAYROLL_FNF_CREATE",
    });
    return objResult.Data;
  },
  async getReport(objFilters: { lwd_from?: string; lwd_to?: string; status?: string; employee_id?: number | ""; department?: string }): Promise<FNFReportResponse> {
    const objParams = new URLSearchParams();
    Object.entries(objFilters).forEach(([strKey, objValue]) => {
      if (objValue !== undefined && objValue !== "" && objValue !== "All" && objValue !== 0) objParams.set(strKey, String(objValue));
    });
    const strQuery = objParams.toString();
    const objResult = await requestApi<FNFReportResponse>({
      strPath: `/payroll/fnf-settlements/report${strQuery ? `?${strQuery}` : ""}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_FNF_VIEW",
    });
    return objResult.Data;
  },
  async generatePayslip(strRecordUUID: string): Promise<FNFPayslipDocument> {
    const objResult = await requestApi<FNFPayslipDocument>({
      strPath: `/payroll/fnf-settlements/${strRecordUUID}/payslip`,
      strMethod: "POST",
      strMenuAction: "PAYROLL_FNF_EDIT",
    });
    return objResult.Data;
  },
  async listPayslips(objFilters: { employee_id?: number | ""; latest_only?: boolean; generated_from?: string; generated_to?: string }): Promise<FNFPayslipRecord[]> {
    const objParams = new URLSearchParams();
    if (objFilters.employee_id) objParams.set("employee_id", String(objFilters.employee_id));
    objParams.set("latest_only", String(objFilters.latest_only ?? true));
    if (objFilters.generated_from) objParams.set("generated_from", objFilters.generated_from);
    if (objFilters.generated_to) objParams.set("generated_to", objFilters.generated_to);
    const objResult = await requestApi<FNFPayslipRecord[]>({
      strPath: `/payroll/fnf-settlements/payslips?${objParams.toString()}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_FNF_VIEW",
    });
    return objResult.Data;
  },
  async listPayslipEmployees(): Promise<FNFPayslipEmployeeOption[]> {
    const objResult = await requestApi<FNFPayslipEmployeeOption[]>({
      strPath: "/payroll/fnf-settlements/payslips/employees",
      strMethod: "GET",
      strMenuAction: "PAYROLL_FNF_VIEW",
    });
    return objResult.Data;
  },
  async listRegularPayslips(intEmployeeID: number, strFromMonth: string, strToMonth: string): Promise<FNFRegularPayslipRecord[]> {
    const objResult = await requestApi<FNFRegularPayslipRecord[]>({
      strPath: `/payroll/fnf-settlements/payslips/regular?employee_id=${intEmployeeID}&from_month=${strFromMonth}&to_month=${strToMonth}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_FNF_VIEW",
    });
    return objResult.Data;
  },
  async getPayslipDocument(strRecordUUID: string): Promise<FNFPayslipDocument> {
    const objResult = await requestApi<FNFPayslipDocument>({
      strPath: `/payroll/fnf-settlements/payslips/${strRecordUUID}/document`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_FNF_EXPORT",
    });
    return objResult.Data;
  },
  async getRegularPayslipDocument(strRecordUUID: string): Promise<FNFPayslipDocument> {
    const objResult = await requestApi<FNFPayslipDocument>({
      strPath: `/payroll/fnf-settlements/payslips/regular/${strRecordUUID}/document`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_FNF_EXPORT",
    });
    return objResult.Data;
  },
  async getPayslipBundle(lstFNFPayslipIDs: string[], lstRegularPayslipIDs: string[]): Promise<FNFPayslipDocument> {
    const objResult = await requestApi<FNFPayslipDocument>({
      strPath: "/payroll/fnf-settlements/payslips/bundle",
      strMethod: "POST",
      objBody: { lstFNFPayslipIDs, lstRegularPayslipIDs },
      strMenuAction: "PAYROLL_FNF_EXPORT",
    });
    return objResult.Data;
  },
  async getPolicy(): Promise<FNFPolicyResponse> {
    const objResult = await requestApi<FNFPolicyResponse>({
      strPath: "/payroll/fnf-settlements/policy",
      strMethod: "GET",
      strMenuAction: "PAYROLL_FNF_VIEW",
    });
    return objResult.Data;
  },
  async savePolicy(objPolicy: FNFPolicy): Promise<FNFPolicyResponse> {
    const objResult = await requestApi<FNFPolicyResponse>({
      strPath: "/payroll/fnf-settlements/policy",
      strMethod: "PUT",
      objBody: objPolicy,
      strMenuAction: "PAYROLL_FNF_APPROVE",
    });
    return objResult.Data;
  },
  async getRegister(objFilters: { lwd_from?: string; lwd_to?: string; status?: string }): Promise<FNFRegisterResponse> {
    const objParams = new URLSearchParams();
    Object.entries(objFilters).forEach(([strKey, strValue]) => {
      if (strValue && strValue !== "All") objParams.set(strKey, strValue);
    });
    const strQuery = objParams.toString();
    const objResult = await requestApi<FNFRegisterResponse>({
      strPath: `/payroll/fnf-settlements/register${strQuery ? `?${strQuery}` : ""}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_FNF_VIEW",
    });
    return objResult.Data;
  },
  async getPaymentAdvice(): Promise<FNFPaymentAdviceResponse> {
    const objResult = await requestApi<FNFPaymentAdviceResponse>({
      strPath: "/payroll/fnf-settlements/payment-advice",
      strMethod: "GET",
      strMenuAction: "PAYROLL_FNF_MARK_PAID",
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
