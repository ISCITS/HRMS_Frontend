import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi, type ApiEnvelope } from "@/Common/utils/apiErrorHandler";
import type {
  PayrollResultDetailRecord,
  PayrollResultListRecord,
} from "@/features/payroll/types";

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: ApiRequestMethod | "GET";
  strMenuAction: string;
}): Promise<ApiEnvelope<TData>> {
  return requestEncryptedApi<TData>({
    strPath: `${ApiRoutePrefix.ApiV1}${objOptions.strPath}`,
    strMethod: objOptions.strMethod as ApiRequestMethod,
    strMenuAction: objOptions.strMenuAction,
    blnUseAuthHeader: true,
  });
}

export const payrollResultService = {
  async getPayrollResults(objFilters?: {
    strSearchEmployee?: string;
    strSearchRun?: string;
    strStatus?: string;
  }): Promise<PayrollResultListRecord[]> {
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
    const objResult = await requestApi<PayrollResultListRecord[]>({
      strPath: `/payroll/results${strQuery ? `?${strQuery}` : ""}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_RESULT_LIST",
    });
    return objResult.Data;
  },

  async getPayrollResultById(
    intResultID: number
  ): Promise<PayrollResultDetailRecord> {
    const objResult = await requestApi<PayrollResultDetailRecord>({
      strPath: `/payroll/results/${intResultID}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_RESULT_VIEW",
    });
    return objResult.Data;
  },
};
