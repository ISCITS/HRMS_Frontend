import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi, type ApiEnvelope } from "@/Common/utils/apiErrorHandler";
import type {
  PayrollRunDetailRecord,
  PayrollRunFormValues,
  PayrollRunListRecord,
  PayrollRunStatus,
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
    strRunCode: "",
    strRunName: "",
    dtPayrollMonth: new Date().toISOString().slice(0, 10),
    strRunStatus: "Open",
    blnIsLocked: false,
  };
}

function toPayload(dicValues: PayrollRunFormValues) {
  return {
    strRunCode: dicValues.strRunCode.trim(),
    strRunName: dicValues.strRunName.trim(),
    dtPayrollMonth: dicValues.dtPayrollMonth,
    strRunStatus: dicValues.strRunStatus,
    blnIsLocked: dicValues.blnIsLocked,
  };
}

export const payrollRunService = {
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

  async getPayrollRunById(intRunID: number): Promise<PayrollRunDetailRecord> {
    const objResult = await requestApi<PayrollRunDetailRecord>({
      strPath: `/payroll/runs/${intRunID}`,
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
    intRunID: number,
    strRunStatus: PayrollRunStatus,
    blnIsLocked: boolean
  ): Promise<PayrollRunDetailRecord> {
    const objResult = await requestApi<PayrollRunDetailRecord>({
      strPath: `/payroll/runs/${intRunID}/status`,
      strMethod: "PUT",
      objBody: { strRunStatus, blnIsLocked },
      strMenuAction: "PAYROLL_RUN_UPDATE_STATUS",
    });
    return objResult.Data;
  },
};
