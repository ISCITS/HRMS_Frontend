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

function buildListQuery(objFilters?: Record<string, string>) {
  const objParams = new URLSearchParams();
  Object.entries(objFilters || {}).forEach(([strKey, strValue]) => {
    if (strValue && strValue !== "All") objParams.set(strKey, strValue);
  });
  const strQuery = objParams.toString();
  return strQuery ? `?${strQuery}` : "";
}

export const loanAdvanceService = {
  async listLoans(objFilters?: Record<string, string>): Promise<LoanAdvanceRecord[]> {
    const strQuery = buildListQuery(objFilters);
    try {
      const objResult = await requestApi<LoanAdvanceRecord[]>({
        strPath: `/payroll/loans-advances${strQuery}`,
        strMethod: "GET",
        strMenuAction: "LOAN_ADV_VIEW",
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
        strMenuAction: "LOAN_ADV_VIEW",
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
      strMenuAction: "LOAN_ADV_VIEW",
    });
    return objResult.Data;
  },
  async getLoan(strRecordUUID: string): Promise<LoanAdvanceRecord> {
    const objResult = await requestApi<LoanAdvanceRecord>({
      strPath: `/payroll/loans-advances/${strRecordUUID}`,
      strMethod: "GET",
      strMenuAction: "LOAN_ADV_VIEW",
    });
    return objResult.Data;
  },
  async createLoan(dicValues: LoanAdvanceFormValues, objCalculationSnapshot?: unknown): Promise<LoanAdvanceRecord> {
    const objResult = await requestApi<LoanAdvanceRecord>({
      strPath: "/payroll/loans-advances",
      strMethod: "POST",
      objBody: toPayload(dicValues, objCalculationSnapshot),
      strMenuAction: "LOAN_ADV_CREATE",
    });
    return objResult.Data;
  },
  async updateLoan(strRecordUUID: string, dicValues: LoanAdvanceFormValues, objCalculationSnapshot?: unknown): Promise<LoanAdvanceRecord> {
    const objResult = await requestApi<LoanAdvanceRecord>({
      strPath: `/payroll/loans-advances/${strRecordUUID}`,
      strMethod: "PUT",
      objBody: toPayload(dicValues, objCalculationSnapshot),
      strMenuAction: "LOAN_ADV_EDIT",
    });
    return objResult.Data;
  },
  async action(strRecordUUID: string, strAction: string, objBody?: unknown): Promise<LoanAdvanceRecord> {
    const dicActionCodeByAction: Record<string, string> = {
      "save-draft": "LOAN_ADV_EDIT",
      submit: "LOAN_ADV_SUBMIT",
      approve: "LOAN_ADV_APPROVE",
      reject: "LOAN_ADV_REJECT",
      "send-back": "LOAN_ADV_APPROVE",
      cancel: "LOAN_ADV_CANCEL",
      disburse: "LOAN_ADV_DISBURSE",
      activate: "LOAN_ADV_DISBURSE",
      close: "LOAN_ADV_CLOSE",
      "manual-recovery": "LOAN_ADV_MANUAL_RECOVERY",
      "skip-installment": "LOAN_ADV_SKIP_INSTALLMENT",
      "adjust-schedule": "LOAN_ADV_ADJUST_SCHEDULE",
    };
    const objResult = await requestApi<LoanAdvanceRecord>({
      strPath: `/payroll/loans-advances/${strRecordUUID}/${strAction}`,
      strMethod: "POST",
      objBody,
      strMenuAction: dicActionCodeByAction[strAction] || "LOAN_ADV_VIEW",
    });
    return objResult.Data;
  },
  async listEssLoans(objFilters?: Record<string, string>): Promise<LoanAdvanceRecord[]> {
    const objResult = await requestApi<LoanAdvanceRecord[]>({
      strPath: `/ess/loans-advances${buildListQuery(objFilters)}`,
      strMethod: "GET",
      strMenuAction: "ESS_LOAN_ADV_VIEW",
    });
    return objResult.Data;
  },
  async listEssCategories(strRequestType?: string): Promise<LoanAdvanceCategoryRecord[]> {
    const strQuery = strRequestType ? `?request_type=${encodeURIComponent(strRequestType)}` : "";
    const objResult = await requestApi<LoanAdvanceCategoryRecord[]>({
      strPath: `/ess/loans-advances/categories${strQuery}`,
      strMethod: "GET",
      strMenuAction: "ESS_LOAN_ADV_VIEW",
    });
    return objResult.Data;
  },
  async getEssCategoryPolicy(intCategoryID: number): Promise<LoanAdvanceCategoryRecord> {
    const objResult = await requestApi<LoanAdvanceCategoryRecord>({
      strPath: `/ess/loans-advances/categories/${intCategoryID}/policy`,
      strMethod: "GET",
      strMenuAction: "ESS_LOAN_ADV_VIEW",
    });
    return objResult.Data;
  },
  async getEssLoan(strRecordUUID: string): Promise<LoanAdvanceRecord> {
    const objResult = await requestApi<LoanAdvanceRecord>({
      strPath: `/ess/loans-advances/${strRecordUUID}`,
      strMethod: "GET",
      strMenuAction: "ESS_LOAN_ADV_VIEW",
    });
    return objResult.Data;
  },
  async createEssLoan(dicValues: LoanAdvanceFormValues, objCalculationSnapshot?: unknown): Promise<LoanAdvanceRecord> {
    const objPayload = toPayload(dicValues, objCalculationSnapshot);
    delete (objPayload as { intEmployeeID?: number }).intEmployeeID;
    delete (objPayload as { strEmployeeCode?: string }).strEmployeeCode;
    const objResult = await requestApi<LoanAdvanceRecord>({
      strPath: "/ess/loans-advances",
      strMethod: "POST",
      objBody: objPayload,
      strMenuAction: "ESS_LOAN_ADV_CREATE",
    });
    return objResult.Data;
  },
  async updateEssLoan(strRecordUUID: string, dicValues: LoanAdvanceFormValues, objCalculationSnapshot?: unknown): Promise<LoanAdvanceRecord> {
    const objPayload = toPayload(dicValues, objCalculationSnapshot);
    delete (objPayload as { intEmployeeID?: number }).intEmployeeID;
    delete (objPayload as { strEmployeeCode?: string }).strEmployeeCode;
    const objResult = await requestApi<LoanAdvanceRecord>({
      strPath: `/ess/loans-advances/${strRecordUUID}`,
      strMethod: "PUT",
      objBody: objPayload,
      strMenuAction: "ESS_LOAN_ADV_EDIT",
    });
    return objResult.Data;
  },
  async essAction(strRecordUUID: string, strAction: "submit" | "cancel", objBody?: unknown): Promise<LoanAdvanceRecord> {
    const objResult = await requestApi<LoanAdvanceRecord>({
      strPath: `/ess/loans-advances/${strRecordUUID}/${strAction}`,
      strMethod: "POST",
      objBody,
      strMenuAction: strAction === "submit" ? "ESS_LOAN_ADV_SUBMIT" : "ESS_LOAN_ADV_CANCEL",
    });
    return objResult.Data;
  },
};
