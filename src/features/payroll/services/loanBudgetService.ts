import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi, type ApiEnvelope } from "@/Common/utils/apiErrorHandler";
import type { LoanBudgetConfigurationRecord, LoanBudgetFormValues, LoanBudgetSummaryRecord } from "@/features/payroll/types";

async function requestApi<TData>(objOptions: { strPath: string; strMethod: ApiRequestMethod | "GET" | "POST" | "PUT"; objBody?: unknown; strMenuAction: string }): Promise<ApiEnvelope<TData>> {
  return requestEncryptedApi<TData>({
    strPath: `${ApiRoutePrefix.ApiV1}${objOptions.strPath}`,
    strMethod: objOptions.strMethod as ApiRequestMethod,
    objBody: objOptions.objBody,
    strMenuAction: objOptions.strMenuAction,
    blnUseAuthHeader: true,
  });
}

export function createInitialLoanBudgetForm(strFinancialYear: string): LoanBudgetFormValues {
  return {
    strFinancialYear,
    decTotalBudgetAmount: "",
    strRemarks: "",
    lstDesignationLimits: [],
  };
}

export function toLoanBudgetForm(objRecord: LoanBudgetConfigurationRecord): LoanBudgetFormValues {
  return {
    strFinancialYear: objRecord.objBudget.strFinancialYear,
    decTotalBudgetAmount: String(objRecord.objBudget.decTotalBudgetAmount ?? ""),
    strRemarks: objRecord.objBudget.strRemarks || "",
    lstDesignationLimits: objRecord.lstDesignationLimits.map((objRow) => ({
      intDesignationID: objRow.intDesignationID,
      decLimitAmount: String(objRow.decLimitAmount ?? ""),
      strEmployeeScope: objRow.strEmployeeScope,
      lstEmployees: objRow.lstEmployees.map((objEmployee) => ({
        intEmployeeID: objEmployee.intEmployeeID,
        strEmployeeCode: objEmployee.strEmployeeCode,
        strEmployeeName: objEmployee.strEmployeeName,
        decLimitAmount: String(objEmployee.decLimitAmount ?? ""),
      })),
    })),
  };
}

function toPayload(dicValues: LoanBudgetFormValues) {
  return {
    objBudget: {
      strFinancialYear: dicValues.strFinancialYear,
      decTotalBudgetAmount: Number(dicValues.decTotalBudgetAmount || 0),
      strRemarks: dicValues.strRemarks.trim() || undefined,
    },
    lstDesignationLimits: dicValues.lstDesignationLimits
      .filter((objRow) => objRow.intDesignationID !== "")
      .map((objRow) => ({
        intDesignationID: Number(objRow.intDesignationID),
        decLimitAmount: Number(objRow.decLimitAmount || 0),
        strEmployeeScope: objRow.strEmployeeScope,
        lstEmployeeLimits:
          objRow.strEmployeeScope === "specific"
            ? objRow.lstEmployees.map((objEmployee) => ({ intEmployeeID: objEmployee.intEmployeeID, decLimitAmount: Number(objEmployee.decLimitAmount || 0) }))
            : [],
      })),
  };
}

export const loanBudgetService = {
  async listDesignationOptions(): Promise<{ intID: number; strDesignationName: string }[]> {
    const objResult = await requestApi<{ intID: number; strDesignationName: string }[]>({
      strPath: "/payroll/loan-budget/lookups/designations",
      strMethod: "GET",
      strMenuAction: "LOAN_BUDGET_VIEW",
    });
    return objResult.Data;
  },
  async listEmployeesInDesignation(intDesignationID: number): Promise<{ intEmployeeID: number; strEmployeeCode: string; strEmployeeName: string }[]> {
    const objResult = await requestApi<{ intEmployeeID: number; strEmployeeCode: string; strEmployeeName: string }[]>({
      strPath: `/payroll/loan-budget/lookups/employees?designation_id=${intDesignationID}`,
      strMethod: "GET",
      strMenuAction: "LOAN_BUDGET_VIEW",
    });
    return objResult.Data;
  },
  async listBudgets(): Promise<LoanBudgetSummaryRecord[]> {
    const objResult = await requestApi<LoanBudgetSummaryRecord[]>({ strPath: "/payroll/loan-budget", strMethod: "GET", strMenuAction: "LOAN_BUDGET_VIEW" });
    return objResult.Data;
  },
  async getBudget(strFinancialYear: string): Promise<LoanBudgetConfigurationRecord> {
    const objResult = await requestApi<LoanBudgetConfigurationRecord>({
      strPath: `/payroll/loan-budget/${encodeURIComponent(strFinancialYear)}`,
      strMethod: "GET",
      strMenuAction: "LOAN_BUDGET_VIEW",
    });
    return objResult.Data;
  },
  async saveBudget(dicValues: LoanBudgetFormValues): Promise<LoanBudgetConfigurationRecord> {
    const objResult = await requestApi<LoanBudgetConfigurationRecord>({
      strPath: "/payroll/loan-budget",
      strMethod: "POST",
      objBody: toPayload(dicValues),
      strMenuAction: "LOAN_BUDGET_CREATE",
    });
    return objResult.Data;
  },
};
