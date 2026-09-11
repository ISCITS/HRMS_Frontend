import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi, type ApiEnvelope } from "@/Common/utils/apiErrorHandler";
import type {
  PayrollRunDetailRecord,
  PayrollRunFormOptions,
  PayrollRunFormValues,
  PayrollRunListRecord,
  PayrollProcessSummary,
  PayrollRunStatus,
  PayrollValidationSummary,
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

export function createInitialPayrollRunForm(): PayrollRunFormValues {
  return {
    intPayrollCycleID: "",
    strRunName: "",
    strScopeType: "All",
    strProcessFor: "PayrollGroup",
    intScopedEmployeeID: "",
    dtPayrollMonth: new Date().toISOString().slice(0, 10),
    strRunStatus: "DRAFT",
    blnIsLocked: false,
    strRemarks: "",
    intRunTypeID: "",
    dtPaymentDate: "",
    intVariablePayTypeID: "",
    intReferencePayrollRunID: "",
  };
}

function toPayload(dicValues: PayrollRunFormValues) {
  return {
    intPayrollCycleID: dicValues.intPayrollCycleID || undefined,
    strRunName: dicValues.strRunName.trim(),
    strScopeType: dicValues.strScopeType,
    intScopedEmployeeID:
      dicValues.strScopeType === "SelectedEmployee"
        ? Number(dicValues.intScopedEmployeeID)
        : null,
    dtPayrollMonth: dicValues.dtPayrollMonth,
    strRunStatus: dicValues.strRunStatus,
    blnIsLocked: dicValues.blnIsLocked,
    strRemarks: dicValues.strRemarks.trim() || undefined,
    intRunTypeID: dicValues.intRunTypeID || undefined,
    dtPaymentDate: dicValues.dtPaymentDate || undefined,
    intVariablePayTypeID: dicValues.intVariablePayTypeID || undefined,
    intReferencePayrollRunID: dicValues.intReferencePayrollRunID || undefined,
  };
}

export const payrollRunService = {
  async getFormOptions(): Promise<PayrollRunFormOptions> {
    const objResult = await requestApi<PayrollRunFormOptions>({
      strPath: "/payroll/runs/form-options",
      strMethod: "GET",
      strMenuAction: "PAYROLL_RUN_VIEW",
    });
    return objResult.Data;
  },

  async getPayrollRuns(objFilters?: {
    strSearch?: string;
    strStatus?: string;
  }): Promise<PayrollRunListRecord[]> {
    const objParams = new URLSearchParams();
    if (objFilters?.strSearch?.trim()) {
      objParams.set("strSearch", objFilters.strSearch.trim());
    }
    if (objFilters?.strStatus?.trim() && objFilters.strStatus !== "All") {
      objParams.set("strStatus", objFilters.strStatus.trim());
    }
    const strQuery = objParams.toString();
    const objResult = await requestApi<PayrollRunListRecord[]>({
      strPath: `/payroll/runs${strQuery ? `?${strQuery}` : ""}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_RUN_LIST",
    });
    return objResult.Data;
  },

  async getPayrollRunById(strRunID: string): Promise<PayrollRunDetailRecord> {
    const objResult = await requestApi<PayrollRunDetailRecord>({
      strPath: `/payroll/runs/${strRunID}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_RUN_VIEW",
    });
    return objResult.Data;
  },

  async createPayrollRun(
    dicValues: PayrollRunFormValues
  ): Promise<PayrollRunDetailRecord> {
    const objResult = await requestApi<PayrollRunDetailRecord>({
      strPath: "/payroll/runs",
      strMethod: "POST",
      objBody: toPayload(dicValues),
      strMenuAction: "PAYROLL_RUN_CREATE",
    });
    return objResult.Data;
  },

  async updatePayrollRunStatus(
    strRunID: string,
    strRunStatus: PayrollRunStatus,
    blnIsLocked: boolean,
    strScopeType?: PayrollRunFormValues["strScopeType"],
    intScopedEmployeeID?: number | ""
  ): Promise<PayrollRunDetailRecord> {
    const objResult = await requestApi<PayrollRunDetailRecord>({
      strPath: `/payroll/runs/${strRunID}/status`,
      strMethod: "PUT",
      objBody: {
        strRunStatus,
        blnIsLocked,
        strScopeType,
        intScopedEmployeeID:
          strScopeType === "SelectedEmployee" ? Number(intScopedEmployeeID) : null,
      },
      strMenuAction: "PAYROLL_RUN_UPDATE_STATUS",
    });
    return objResult.Data;
  },

  async validatePayrollRun(
    strRunID: string,
    lstEmployeeIDs?: number[]
  ): Promise<PayrollValidationSummary> {
    const objResult = await requestApi<PayrollValidationSummary>({
      strPath: `/payroll/runs/${strRunID}/validate`,
      strMethod: "POST",
      objBody: lstEmployeeIDs?.length ? { lstEmployeeIDs } : undefined,
      strMenuAction: "PAYROLL_RUN_VALIDATE",
    });
    return objResult.Data;
  },

  async processPayrollRun(
    strRunID: string,
    lstEmployeeIDs?: number[]
  ): Promise<PayrollProcessSummary> {
    const objResult = await requestApi<PayrollProcessSummary>({
      strPath: `/payroll/runs/${strRunID}/process`,
      strMethod: "POST",
      objBody: lstEmployeeIDs?.length ? { lstEmployeeIDs } : undefined,
      strMenuAction: "PAYROLL_RUN_PROCESS",
    });
    return objResult.Data;
  },

  async reprocessPayrollRun(
    strRunID: string,
    strReason: string,
    lstEmployeeIDs?: number[]
  ): Promise<PayrollProcessSummary> {
    const objResult = await requestApi<PayrollProcessSummary>({
      strPath: `/payroll/runs/${strRunID}/reprocess`,
      strMethod: "POST",
      objBody: {
        strReason,
        lstEmployeeIDs: lstEmployeeIDs?.length ? lstEmployeeIDs : undefined,
      },
      strMenuAction: "PAYROLL_RUN_REPROCESS",
    });
    return objResult.Data;
  },

  async closePayrollRun(strRunID: string): Promise<PayrollRunDetailRecord> {
    const objResult = await requestApi<PayrollRunDetailRecord>({
      strPath: `/payroll/runs/${strRunID}/close`,
      strMethod: "POST",
      strMenuAction: "PAYROLL_RUN_CLOSE",
    });
    return objResult.Data;
  },

  async reopenPayrollRun(strRunID: string, strReason: string): Promise<PayrollRunDetailRecord> {
    const objResult = await requestApi<PayrollRunDetailRecord>({
      strPath: `/payroll/runs/${strRunID}/reopen`,
      strMethod: "POST",
      objBody: { strReason },
      strMenuAction: "PAYROLL_RUN_REOPEN",
    });
    return objResult.Data;
  },

  async cancelPayrollRun(strRunID: string): Promise<PayrollRunDetailRecord> {
    const objResult = await requestApi<PayrollRunDetailRecord>({
      strPath: `/payroll/runs/${strRunID}/cancel`,
      strMethod: "POST",
      strMenuAction: "PAYROLL_RUN_CANCEL",
    });
    return objResult.Data;
  },
};
