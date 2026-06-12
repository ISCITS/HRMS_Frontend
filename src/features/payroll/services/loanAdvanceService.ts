import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { ApiRequestError, requestEncryptedApi, type ApiEnvelope } from "@/Common/utils/apiErrorHandler";
import type { LoanAdvanceCategoryRecord, LoanAdvanceFormValues, LoanAdvanceRecord } from "@/features/payroll/types";

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

function isMissingBackendRoute(objError: unknown) {
  return objError instanceof ApiRequestError && objError.intStatusCode === 404;
}

export function createInitialLoanAdvanceForm(): LoanAdvanceFormValues {
  const strToday = new Date().toISOString().slice(0, 10);
  return {
    intEmployeeID: "",
    strEmployeeCode: "",
    strRequestType: "loan",
    intCategoryID: "",
    dtRequestDate: strToday,
    decRequestedAmount: "",
    decApprovedAmount: "",
    strReason: "",
    strEmployeeRemarks: "",
    strApproverRemarks: "",
    strPayrollRemarks: "",
    strRecoveryMode: "payroll",
    dtRecoveryStartMonth: strToday.slice(0, 8) + "01",
    intNumberOfInstallments: "1",
    decInstallmentAmount: "",
    blnLastInstallmentAdjustment: true,
    blnAutoDeductInPayroll: true,
  };
}

export function toLoanAdvanceForm(objRecord: LoanAdvanceRecord): LoanAdvanceFormValues {
  return {
    intEmployeeID: objRecord.intEmployeeID || "",
    strEmployeeCode: objRecord.objEmployee?.strEmployeeCode || "",
    strRequestType: objRecord.strRequestType || "loan",
    intCategoryID: objRecord.intCategoryID || "",
    dtRequestDate: (objRecord.dtRequestDate || "").slice(0, 10),
    decRequestedAmount: String(objRecord.decRequestedAmount || ""),
    decApprovedAmount: String(objRecord.decApprovedAmount || ""),
    strReason: objRecord.strReason || "",
    strEmployeeRemarks: objRecord.strEmployeeRemarks || "",
    strApproverRemarks: objRecord.strApproverRemarks || "",
    strPayrollRemarks: objRecord.strPayrollRemarks || "",
    strRecoveryMode: objRecord.strRecoveryMode || "payroll",
    dtRecoveryStartMonth: (objRecord.dtRecoveryStartMonth || "").slice(0, 10),
    intNumberOfInstallments: String(objRecord.intNumberOfInstallments || 1),
    decInstallmentAmount: String(objRecord.decInstallmentAmount || ""),
    blnLastInstallmentAdjustment: objRecord.blnLastInstallmentAdjustment ?? true,
    blnAutoDeductInPayroll: objRecord.blnAutoDeductInPayroll ?? true,
  };
}

function toPayload(dicValues: LoanAdvanceFormValues, objCalculationSnapshot?: unknown) {
  return {
    intEmployeeID: dicValues.intEmployeeID ? Number(dicValues.intEmployeeID) : undefined,
    strEmployeeCode: dicValues.strEmployeeCode.trim() || undefined,
    strRequestType: dicValues.strRequestType,
    intCategoryID: Number(dicValues.intCategoryID),
    dtRequestDate: dicValues.dtRequestDate || undefined,
    decRequestedAmount: Number(dicValues.decRequestedAmount || 0),
    decApprovedAmount: Number(dicValues.decApprovedAmount || 0),
    strReason: dicValues.strReason.trim() || undefined,
    strEmployeeRemarks: dicValues.strEmployeeRemarks.trim() || undefined,
    strApproverRemarks: dicValues.strApproverRemarks.trim() || undefined,
    strPayrollRemarks: dicValues.strPayrollRemarks.trim() || undefined,
    strRecoveryMode: dicValues.strRecoveryMode,
    dtRecoveryStartMonth: dicValues.dtRecoveryStartMonth || undefined,
    intNumberOfInstallments: Number(dicValues.intNumberOfInstallments || 1),
    decInstallmentAmount: Number(dicValues.decInstallmentAmount || 0),
    blnLastInstallmentAdjustment: dicValues.blnLastInstallmentAdjustment,
    blnAutoDeductInPayroll: dicValues.blnAutoDeductInPayroll,
    objCalculationSnapshot,
  };
}

export const loanAdvanceService = {
  async listLoans(objFilters?: Record<string, string>): Promise<LoanAdvanceRecord[]> {
    const objParams = new URLSearchParams();
    Object.entries(objFilters || {}).forEach(([strKey, strValue]) => {
      if (strValue && strValue !== "All") objParams.set(strKey, strValue);
    });
    const strQuery = objParams.toString();
    try {
      const objResult = await requestApi<LoanAdvanceRecord[]>({
        strPath: `/payroll/loans-advances${strQuery ? `?${strQuery}` : ""}`,
        strMethod: "GET",
        strMenuAction: "PAYROLL_LOANS_ADVANCES_VIEW",
      });
      return objResult.Data;
    } catch (objError) {
      if (isMissingBackendRoute(objError)) {
        return [];
      }
      throw objError;
    }
  },
  async listCategories(strRequestType?: string): Promise<LoanAdvanceCategoryRecord[]> {
    const strQuery = strRequestType ? `?request_type=${encodeURIComponent(strRequestType)}` : "";
    try {
      const objResult = await requestApi<LoanAdvanceCategoryRecord[]>({
        strPath: `/payroll/loans-advances/categories${strQuery}`,
        strMethod: "GET",
        strMenuAction: "PAYROLL_LOANS_ADVANCES_VIEW",
      });
      return objResult.Data;
    } catch (objError) {
      if (isMissingBackendRoute(objError)) {
        return [];
      }
      throw objError;
    }
  },
  async getCategoryPolicy(intCategoryID: number): Promise<LoanAdvanceCategoryRecord> {
    const objResult = await requestApi<LoanAdvanceCategoryRecord>({
      strPath: `/payroll/loans-advances/categories/${intCategoryID}/policy`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_LOANS_ADVANCES_VIEW",
    });
    return objResult.Data;
  },
  async getLoan(intID: number): Promise<LoanAdvanceRecord> {
    const objResult = await requestApi<LoanAdvanceRecord>({
      strPath: `/payroll/loans-advances/${intID}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_LOANS_ADVANCES_VIEW",
    });
    return objResult.Data;
  },
  async createLoan(dicValues: LoanAdvanceFormValues, objCalculationSnapshot?: unknown): Promise<LoanAdvanceRecord> {
    const objResult = await requestApi<LoanAdvanceRecord>({
      strPath: "/payroll/loans-advances",
      strMethod: "POST",
      objBody: toPayload(dicValues, objCalculationSnapshot),
      strMenuAction: "PAYROLL_LOANS_ADVANCES_ADD",
    });
    return objResult.Data;
  },
  async updateLoan(intID: number, dicValues: LoanAdvanceFormValues, objCalculationSnapshot?: unknown): Promise<LoanAdvanceRecord> {
    const objResult = await requestApi<LoanAdvanceRecord>({
      strPath: `/payroll/loans-advances/${intID}`,
      strMethod: "PUT",
      objBody: toPayload(dicValues, objCalculationSnapshot),
      strMenuAction: "PAYROLL_LOANS_ADVANCES_EDIT",
    });
    return objResult.Data;
  },
  async action(intID: number, strAction: string, objBody?: unknown): Promise<LoanAdvanceRecord> {
    const dicActionCodeByAction: Record<string, string> = {
      "save-draft": "PAYROLL_LOANS_ADVANCES_EDIT",
      submit: "PAYROLL_LOANS_ADVANCES_SUBMIT",
      approve: "PAYROLL_LOANS_ADVANCES_APPROVE",
      reject: "PAYROLL_LOANS_ADVANCES_APPROVE",
      "send-back": "PAYROLL_LOANS_ADVANCES_APPROVE",
      cancel: "PAYROLL_LOANS_ADVANCES_DELETE",
      disburse: "PAYROLL_LOANS_ADVANCES_APPROVE",
      activate: "PAYROLL_LOANS_ADVANCES_APPROVE",
      close: "PAYROLL_LOANS_ADVANCES_APPROVE",
    };
    const objResult = await requestApi<LoanAdvanceRecord>({
      strPath: `/payroll/loans-advances/${intID}/${strAction}`,
      strMethod: "POST",
      objBody,
      strMenuAction: dicActionCodeByAction[strAction] || "PAYROLL_LOANS_ADVANCES_VIEW",
    });
    return objResult.Data;
  },
};
